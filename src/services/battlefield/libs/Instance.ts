import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"
import { PrependAction } from "../../../util/PrependAction"
import { Connection } from "./Connection"
import { PluginManager } from "@service/plugin/main/PluginManager"
import { Variable } from "vu-rcon/lib/Variable"
import { Player } from "@entity/Player"
import { ChatManager } from "./ChatManager"
import { KillFeedManager } from "./KillFeedManager"
import { InstanceLogger } from "./InstanceLogger"
import { getScopesFromMask } from "@service/permissions/Scopes"

export class Instance {

  readonly connection: Connection
  readonly state: InstanceContainer
  readonly plugin: PluginManager
  readonly chat: ChatManager
  readonly kill: KillFeedManager
  readonly log: InstanceLogger
  private interval: any
  private intervalModulo = -1
  private syncInterval: number
  private playerListAction: PrependAction<Battlefield.PlayerList>
  private readyPromise: { resolver: Promise<void>, resolve: () => void } = {
    resolver: new Promise(() => null),
    resolve: () => null
  }

  constructor(props: Instance.Props) {
    this.state = new InstanceContainer({ entity: props.entity })
    this.log = new InstanceLogger({ instance: this })
    this.syncInterval = props.entity.syncInterval
    this.readyPromise.resolver = new Promise(fulfill => {
      this.readyPromise.resolve = fulfill
    })
    this.connection = new Connection({
      options: {
        host: props.entity.host,
        port: props.entity.port,
        password: props.entity.password
      },
      instance: this
    })
    this.chat = new ChatManager({ instance: this })
    this.kill = new KillFeedManager({ instance: this })
    this.plugin = new PluginManager({ parent: this })
    this.playerListAction = new PrependAction({
      shouldExecute: () => {
        const { slots } = this.state.get("serverinfo")
        return (slots && slots > 0) || Object.keys(this.state.get("players")).length > 0
      },
      execute: () => this.playerList(),
      minimumInterval: this.syncInterval * 2,
      prependTimeout: this.syncInterval * 1
    })
    this.registerEvents()
    this.connection.on("disconnected", async () => {
      this.stopUpdateInterval()
      await this.plugin.stop()
    })
    this.connection.on("connected", async () => {
      this.startUpdateInterval()
      await this.plugin.start()
    })
    if (props.entity.autostart) {
      this.doAutostart()
        .catch(() => this.readyPromise.resolve())
    } else {
      this.readyPromise.resolve()
    }
  }

  get ready() {
    return this.readyPromise.resolver
  }

  /** retrieves the current battlefield connection */
  get battlefield() {
    return this.connection.battlefield
  }

  /** current instance id from the database */
  get id() {
    return this.state.id
  }

  /** instance type */
  get version() {
    return this.state.get("version")
  }

  get isDisconnected() {
    return [
      Instance.State.DISCONNECTED,
      Instance.State.RECONNECTING_FAILED
    ].includes(this.state.get("state"))
  }

  /** handles autostart after instance has been created */
  private async doAutostart() {
    try {
      await this.start()
    } catch (e) {
      this.log.warn(`could not connect to battlefield server: ${e.message}`)
    }
  }

  /** registers handler for events */
  private registerEvents() {
    this.battlefield.on("playerLeave", event => {
      this.playerListAction.prepend()
      this.state.removePlayer(event.player.guid)
    })
    this.battlefield.on("playerAuthenticated", async () => {
      await this.playerListAction.execute()
    })
    this.battlefield.on("squadChange", async ({ player, squad, team }) => {
      this.playerListAction.prepend()
      if (!this.state.updatePlayerPropsByName(player, { squadId: squad, teamId: team })) {
        await this.playerListAction.execute()
      }
    })
    this.battlefield.on("teamChange", async ({ player, squad, team }) => {
      this.playerListAction.prepend()
      if (!this.state.updatePlayerPropsByName(player, { squadId: squad, teamId: team })) {
        await this.playerListAction.execute()
      }
    })
  }

  /** starts the update interval */
  private async startUpdateInterval() {
    clearInterval(this.interval)
    this.interval = setInterval(this.updateInterval.bind(this), this.syncInterval)
    this.playerListAction.unpause()
    await Promise.all([
      this.playerListAction.execute(),
      this.updateInterval(),
      this.currentMapIndices()
    ])
    this.readyPromise.resolve()
  }

  /** stopts the update interval */
  private stopUpdateInterval() {
    this.playerListAction.pause()
    clearInterval(this.interval)
  }

  /** gets permission scopes for a specific guid in this instance */
  async requestPermissionForGuid(guid: string): Promise<string[]> {
    const player = await Player.findOne({ guid })
    if (!player) return []
    const users = await player.users
    if (users.length === 0) return []
    const mask = (await Promise.all(
      users.map(user => permissionManager.getPermissionsForInstance(user, this.id))
    )).reduce((scopes, scope) => scopes|scope, 0n)
    return getScopesFromMask(mask)
  }


  /** retrieves a single player entity by its name */
  async getPlayerByName(name: string) {
    const player = await Player.findOne({ name })
    return player ? player : this.createPlayerFromName(name)
  }

  /** creates a player entity from its name */
  async createPlayerFromName(name: string) {
    const player = Object.values(this.state.get("players")).find(p => p.name === name)
    if (!player) return undefined
    return Player.from(player)
  }

  async getPlayerDataByName(name: string) {
    return Object.values(this.state.get("players")).find(p => p.name === name)
  }

  /** retrieves multiple player ids by their name */
  async getPlayerIdsByName(names: Record<string, string|undefined>): Promise<Record<string, number|undefined>> {
    return Player.getPlayerIds(
      names,
      this.getPlayerDataByName.bind(this)
    )
  }

  /** checks if the specified user has the specified scope for this instance */
  hasPermission(user: User|number, scope: bigint) {
    return permissionManager.hasPermissions({ instance: this.state.id, user, scope })
  }

  /** runs the update tick */
  private async updateInterval() {
    this.intervalModulo++
    if (this.intervalModulo % 100 === 0) {
      const updates = [
        this.mapList(),
        this.getDefaultVariables()
      ]
      if (this.state.get("version") === InstanceContainer.Version.VU)
        updates.push(this.getVuVariables())
      await Promise.all(updates)
    }
    await this.serverInfo()
  }

  /** starts the connection to the battlefield server */
  async start() {
    await this.connection.start()
  }

  /** disconnects to the battlefield instance */
  async stop() {
    return this.connection.stop()
  }

  /** updates the connection informations for this instance */
  async updateConnection(props: Battlefield.Options) {
    const entity = await InstanceEntity.findOneOrFail({ id: this.id })
    const wasStarted = !this.isDisconnected
    await this.stop()
    await this.connection.updateConnection(props)
    await entity.update({
      host: props.host,
      port: props.port,
      password: props.password
    })
    this.state.updateConnection(props.host, props.port)
    if (wasStarted) await this.start()
  }

  /** removes this instance */
  async remove() {
    await this.stop()
    this.battlefield.removeAllListeners()
    this.state.remove()
  }

  /** updates a single variable on the server */
  async updateVariable(key: string, value: any) {
    let val: any
    let varStore: Variable<any>
    if (Instance.VAR_SETTER_BF3.includes(key)) {
      varStore = this.battlefield.var
    } else if (Instance.VAR_SETTER_VU.includes(key)) {
      varStore = this.battlefield.vu
    } else {
      throw new Error(`unknown variable ${key}`)
    }
    await varStore.set(key, value)
    val = await varStore.get(key)
    return this.state.updateVars({ [key]: val })
  }

  /** retrieves the current maplist */
  async mapList() {
    const maps = await this.battlefield.getMaps()
    this.state.updateMapList(maps)
    return maps
  }

  /** retrieves the current and next map playing */
  async currentMapIndices() {
    const state = await this.battlefield.getMapIndices()
    this.state.updateMapIndex(state)
    return state
  }

  /** retrieves the server info */
  async serverInfo() {
    const info = await this.battlefield.serverInfo()
    this.state.updateServerInfo(info)
    return info
  }

  /** sets the team ticket count */
  async setTeamTicketCount(team: number, count: number) {
    await this.battlefield.setTeamticketCount(team, count)
    await this.serverInfo()
  }

  /* gets the default battlefield variables */
  private async getDefaultVariables() {
    let result = {
      ...Object.fromEntries(
        await Promise.all(Instance.VAR_BF3.map(async key => [key, await this.connection.battlefield.var.get(key)]))
      ),
      ...Object.fromEntries(
        await Promise.all(Object.keys(Instance.VAR_BF3_OPTIONAL).map(async key => {
          try {
            return [key, await this.connection.battlefield.var.get(key)]
          } catch (e) {
            //@ts-ignore
            return [key, Instance.VAR_BF3_OPTIONAL[key]]
          }
        }))
      )
    }
    if (result.ranked) {
      result = {
        ...result,
        ...Object.fromEntries(
          //@ts-ignore
          Object.keys(Instance.VAR_BF3_RANKED).map(k => [k, Instance.VAR_BF3_RANKED[k]])
        )
      }
    } else {
      result = {
        ...result,
        ...Object.fromEntries(await Promise.all(
          Object.keys(Instance.VAR_BF3_RANKED).map(key => this.getVariable(key, "var"))
        ))
      }
    }
    this.state.updateVars(result)
    return result
  }

  /* gets the default battlefield variables */
  private async getVuVariables() {
    const result = Object.fromEntries(
      await Promise.all(Instance.VAR_GETTER_VU.map(key => this.getVariable(key, "vu")))
    )
    this.state.updateVars(result)
    return result
  }

  /** tries to retrieve a variable with namespace and key */
  private async getVariable(key: string, namespace: "vu"|"var") {
    try {
      return [key, await this.connection.battlefield[namespace].get(key)]
    } catch (e) {
      this.log.error(`Could not get variable "${namespace}.${key}": ${e.message}`)
      return [key, undefined]
    }
  }

  /** retrieves all connected players */
  private async playerList() {
    const players = await this.battlefield.getPlayers()
    this.state.updatePlayers(players)
    return players
  }

  getVariableOptions() {
    const getters = [...Instance.VAR_BF3]
    const setters = [...Instance.VAR_SETTER_BF3]
    if (this.state.get("version") === InstanceContainer.Version.BF3) {
      getters.push(...Object.keys(Instance.VAR_BF3_OPTIONAL))
      if (this.state.get("vars").ranked) {
        getters.push(...Object.keys(Instance.VAR_BF3_RANKED))
      }
    } else if (this.state.get("version") === InstanceContainer.Version.VU) {
      setters.push(...Instance.VAR_SETTER_VU)
      getters.push(...Instance.VAR_GETTER_VU)
    }
    return { getters, setters }
  }

  /** creates a new instance from given properties */
  static async from(props: Instance.CreateProps) {
    const instance = new Instance({ entity: props.entity })
    return instance
  }

}

export namespace Instance {

  export interface Props {
    entity: InstanceEntity,
    serverinfo?: Battlefield.ServerInfo
  }

  export interface CreateProps {
    entity: InstanceEntity
  }

  export enum State {
    UNKNOWN = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    DISCONNECTING = 3,
    DISCONNECTED = 4,
    RECONNECTING = 5,
    RECONNECTING_FAILED = 6
  }

  export const VAR_BF3 = [
    "serverName", "autoBalance",
    "friendlyFire", "maxPlayers", "serverDescription",
    "serverMessage", "killCam", "miniMap",
    "hud", "3dSpotting", "miniMapSpotting",
    "nametag", "3pCam", "regenerateHealth",
    "teamKillCountForKick", "teamKillValueForKick", "teamKillValueIncrease",
    "teamKillValueDecreasePerSecond", "teamKillKickForBan", "idleTimeout",
    "idleBanRounds", "roundStartPlayerCount", "roundRestartPlayerCount",
    "roundLockdownCountdown", "vehicleSpawnAllowed", "vehicleSpawnDelay",
    "soldierHealth", "playerRespawnTime", "playerManDownTime", "bulletDamage",
    "gameModeCounter", "onlySquadLeaderSpawn",
    "premiumStatus", "gunMasterWeaponsPreset"
  ]

  export const VAR_VU = [
    "DestructionEnabled", "SuppressionMultiplier",
    "DesertingAllowed", "VehicleDisablingEnabled",
    "HighPerformanceReplication", "ServerBanner",
    "SpectatorCount", "SunFlareEnabled",
    "ColorCorrectionEnabled", "TimeScale",
    "SquadSize"
  ]

  export const VAR_VU_SETTER = [
    "FadeOutAll", "FadeInAll"
  ]

  export const VAR_VU_GETTER = [
    "FrequencyMode"
  ]

  export const VAR_BF3_OPTIONAL = {
    ranked: false,
    unlockMode: 0
  }

  export const VAR_BF3_RANKED =  {
    gamePassword: false
  }

  export const VAR_SETTER_BF3 = [
    ...VAR_BF3,
    ...Object.keys(VAR_BF3_OPTIONAL),
    ...Object.keys(VAR_BF3_RANKED)
  ]
  export const VAR_SETTER_VU = [
    ...VAR_VU, ...VAR_VU_SETTER
  ]
  export const VAR_GETTER_VU = [
    ...VAR_VU, ...VAR_VU_GETTER
  ]

}

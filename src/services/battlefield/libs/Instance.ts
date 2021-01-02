import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"
import { PrependAction } from "../../../util/PrependAction"
import { Connection } from "./Connection"
import { PluginManager } from "@service/plugin/main/PluginManager"
import { Player } from "@entity/Player"
import { ChatManager } from "./ChatManager"
import { KillFeedManager } from "./KillFeedManager"
import { InstanceLogger } from "./InstanceLogger"
import { getScopesFromMask } from "@service/permissions/Scopes"
import { NameResolverService } from "../util/NameResolverService"

export class Instance {

  name: string
  readonly connection: Connection
  readonly state: InstanceContainer
  readonly plugin: PluginManager
  readonly chat: ChatManager
  readonly kill: KillFeedManager
  readonly log: InstanceLogger
  readonly nameResolver: NameResolverService
  private interval: any
  private intervalModulo = -1
  private syncInterval: number
  private playerListAction: PrependAction<Battlefield.PlayerList>
  private readyPromise: { resolver: Promise<void>, resolve: () => void } = {
    resolver: new Promise(() => null),
    resolve: () => null
  }

  constructor(props: Instance.Props) {
    this.name = props.entity.name
    this.state = new InstanceContainer({ entity: props.entity, parent: this })
    this.log = new InstanceLogger({ instance: this })
    this.syncInterval = props.entity.syncInterval
    this.readyPromise.resolver = new Promise(fulfill => {
      this.readyPromise.resolve = fulfill
    })
    this.nameResolver = new NameResolverService({
      resolveName: (name: string) => this.getPlayerGuidByName(name)
    })
    const { host, port, password } = props.entity
    this.connection = new Connection({
      options: { host, port, password },
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
    this.connection.on("disconnected", this.onDisconnect.bind(this))
    this.connection.on("connected", this.onConnect.bind(this))
    if (props.entity.autostart) {
      this.doAutostart()
        .catch(() => this.readyPromise.resolve())
    } else {
      this.readyPromise.resolve()
    }
  }

  private async onDisconnect() {
    this.stopUpdateInterval()
    await this.plugin.stop()
  }

  private async onConnect() {
    this.startUpdateInterval()
    await this.plugin.start()
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

  /** (re-)sets this instance to autostart after venicercon restarts */
  setAutostart(set: boolean) {
    return InstanceEntity.update({ id: this.id }, { autostart: set })
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

  async getPlayerDataByName(name: string) {
    const search = (p: Battlefield.Player) => p.name === name
    let player = Object.values(this.state.get("players")).find(search)
    if (!player) player = (await this.playerList()).find(search)
    return player
  }

  async getPlayerGuidByName(name: string) {
    const data = await this.getPlayerDataByName(name)
    if (!data) throw new Error(`could not find player online with name "${name}" in instance ${this.id}`)
    return data.guid
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
    setTimeout(() => {
      this.battlefield.removeAllListeners()
      this.state.remove()
    }, 500)
  }

  async updateVariables(vars: Record<string, any>) {
    let changes: Record<string, any> = {}
    const results = await Promise.allSettled(Object.keys(vars) .map((k: any) => this.updateVariable(k, vars[k])))
    results.forEach(result => {
      if (result.status === "rejected") return this.log.warn(`could not update a variable: ${result.reason}`)
      changes = { ...changes, ...Object.fromEntries(result.value) }
    })
    if (Object.keys(changes).length > 0) {
      this.plugin.sendPluginEvent("varsChanged", { changes })
    }
    return this.state.get("vars")
  }

  /** updates a single variable on the server */
  async updateVariable(key: Battlefield.BattlefieldVariables, value: any) {
    const setters = [...Instance.VAR_SETTER_BF3, ...Instance.VAR_SETTER_VU]
    if (!setters.includes(key)) throw new Error(`unknown variable ${key}`)
    await this.battlefield.set(key, value)
    return this.state.updateVars({ [key]: String(value) })
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
    if (this.name !== info.name) {
      await InstanceEntity.update({ id: this.id }, { name: info.name })
      this.name = info.name
    }
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
        await Promise.all(Instance.VAR_BF3.map(async key => [key, await this.connection.battlefield.get(key)]))
      ),
      ...Object.fromEntries(
        await Promise.all(Object.keys(Instance.VAR_BF3_OPTIONAL).map(async key => {
          try {
            return [key, await this.connection.battlefield.get(key as Battlefield.BattlefieldVariables)]
          } catch (e) {
            //@ts-ignore
            return [key, Instance.VAR_BF3_OPTIONAL[key]]
          }
        }))
      )
    }
    if (result["vars.ranked"] === "true") {
      result = { ...result, ...Instance.VAR_BF3_RANKED }
    } else {
      result = {
        ...result,
        ...Object.fromEntries(await Promise.all(
          Object.keys(Instance.VAR_BF3_RANKED).map(key => this.getVariable(key as Battlefield.BattlefieldVariables))
        ))
      }
    }
    this.state.updateVars(result)
    return result
  }

  /* gets the default battlefield variables */
  private async getVuVariables() {
    const result = Object.fromEntries(
      await Promise.all(Instance.VAR_GETTER_VU.map(key => this.getVariable(key)))
    )
    this.state.updateVars(result)
    return result
  }

  /** tries to retrieve a variable with namespace and key */
  private async getVariable(key: Battlefield.BattlefieldVariables) {
    try {
      return [key, await this.connection.battlefield.get(key)]
    } catch (e) {
      this.log.error(`Could not get variable "${key}": ${e.message}`)
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
      getters.push(...Object.keys(Instance.VAR_BF3_OPTIONAL) as Battlefield.BattlefieldVariables[])
      if (this.state.get("vars").ranked) {
        getters.push(...Object.keys(Instance.VAR_BF3_RANKED) as Battlefield.BattlefieldVariables[])
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

  export const VAR_BF3: Battlefield.BattlefieldVariables[] = [
    "vars.serverName",
    "vars.autoBalance",
    "vars.friendlyFire",
    "vars.maxPlayers",
    "vars.serverDescription",
    "vars.serverMessage",
    "vars.killCam",
    "vars.miniMap",
    "vars.hud",
    "vars.3dSpotting",
    "vars.miniMapSpotting",
    "vars.nametag",
    "vars.3pCam",
    "vars.regenerateHealth",
    "vars.teamKillCountForKick",
    "vars.teamKillValueForKick",
    "vars.teamKillValueIncrease",
    "vars.teamKillValueDecreasePerSecond",
    "vars.teamKillKickForBan",
    "vars.idleTimeout",
    "vars.idleBanRounds",
    "vars.roundStartPlayerCount",
    "vars.roundRestartPlayerCount",
    "vars.roundLockdownCountdown",
    "vars.vehicleSpawnAllowed",
    "vars.vehicleSpawnDelay",
    "vars.soldierHealth",
    "vars.playerRespawnTime",
    "vars.playerManDownTime",
    "vars.bulletDamage",
    "vars.gameModeCounter",
    "vars.onlySquadLeaderSpawn",
    "vars.premiumStatus",
    "vars.gunMasterWeaponsPreset"
  ]

  export const VAR_VU: Battlefield.BattlefieldVariables[] = [
    "vu.DestructionEnabled",
    "vu.SuppressionMultiplier",
    "vu.DesertingAllowed",
    "vu.VehicleDisablingEnabled",
    "vu.HighPerformanceReplication",
    "vu.ServerBanner",
    "vu.SpectatorCount",
    "vu.SunFlareEnabled",
    "vu.ColorCorrectionEnabled",
    "vu.SquadSize"
  ]

  export const VAR_VU_SETTER: Battlefield.BattlefieldVariables[] = [
    "vu.FadeOutAll", "vu.FadeInAll"
  ]

  export const VAR_VU_GETTER: Battlefield.BattlefieldVariables[] = [
    "vu.FrequencyMode"
  ]

  export const VAR_BF3_OPTIONAL: Record<string, string> = {
    "vars.ranked": "false",
    "vars.unlockMode": "0"
  }

  export const VAR_BF3_RANKED: Record<string, string> =  {
    "vars.gamePassword": "false"
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

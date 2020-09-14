import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"
import { PrependAction } from "../../../util/PrependAction"
import { Connection } from "./Connection"
import { pluginManager } from "@service/plugin"
import { InstancePlugin } from "@service/plugin/main/InstancePlugin"
import { PluginManager } from "@service/plugin/main/PluginManager"
import { Variable } from "vu-rcon/lib/Variable"
import { Player } from "@entity/Player"
import { ChatManager } from "./ChatManager"
import { KillFeedManager } from "./KillFeedManager"
import { InstanceLogger } from "./InstanceLogger"
import winston from "winston"

export class Instance {

  readonly connection: Connection
  readonly state: InstanceContainer
  readonly plugin: InstancePlugin
  readonly chat: ChatManager
  readonly kill: KillFeedManager
  readonly log: InstanceLogger
  private interval: any
  private intervalModulo = -1
  private syncInterval: number
  private playerListAction: PrependAction<Battlefield.PlayerList>

  constructor(props: Instance.Props) {
    this.state = new InstanceContainer({ entity: props.entity })
    this.log = new InstanceLogger({ instance: this })
    this.syncInterval = props.entity.syncInterval
    this.connection = new Connection({
      battlefield: props.battlefield,
      instance: this
    })
    this.chat = new ChatManager({ instance: this })
    this.kill = new KillFeedManager({ instance: this })
    this.plugin = new InstancePlugin({
      instance: this,
      manager: props.pluginManager
    })
    this.playerListAction = new PrependAction({
      shouldExecute: () => {
        const { slots } = this.state.get("serverinfo")
        return Boolean(slots && slots > 0)
      },
      execute: () => this.playerList(),
      minimumInterval: this.syncInterval * 4,
      prependTimeout: this.syncInterval * 2
    })
    this.registerEvents()
    this.battlefield.on("close", () => this.stopUpdateInterval())
    this.battlefield.on("ready", () => this.startUpdateInterval())
  }

  /** battlefield rcon instance */
  get battlefield() {
    return this.connection.battlefield
  }

  /** current instance id from the database */
  get id() {
    return this.state.id
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
    this.interval = setInterval(this.updateInterval.bind(this), this.syncInterval)
    this.playerListAction.unpause()
    await Promise.all([
      this.playerListAction.execute(),
      this.updateInterval(),
      this.currentMapIndices()
    ])
  }

  /** stopts the update interval */
  private stopUpdateInterval() {
    this.playerListAction.pause()
    clearInterval(this.interval)
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
    return Player.getPlayerIds(names, this.getPlayerDataByName.bind(this))
  }

  /** checks if the specified user has the specified scope for this instance */
  hasPermission(user: User|number, scope: bigint) {
    return permissionManager.hasPermission({ instance: this.state.id, user, scope })
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
    return this.connection.start()
  }

  /** disconnects to the battlefield instance */
  async stop() {
    await this.plugin.stop()
    return this.connection.stop()
  }

  /** removes this instance */
  async remove() {
    await this.stop()
    this.battlefield.removeAllListeners()
    this.state.remove()
  }

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
      await Promise.all(Instance.VAR_VU.map(key => this.getVariable(key, "vu")))
    )
    this.state.updateVars(result)
    return result
  }

  /** tries to retrieve a variable with namespace and key */
  private async getVariable(key: string, namespace: "vu"|"var") {
    try {
      return [key, await this.connection.battlefield[namespace].get(key)]
    } catch (e) {
      winston.error(`Could not get variable "${namespace}.${key}": ${e.message}`)
      return [key, undefined]
    }
  }

  /** retrieves all connected players */
  private async playerList() {
    const players = await this.battlefield.getPlayers()
    this.state.updatePlayers(players)
    return players
  }

  /** creates a new instance from given properties */
  static async from(props: Instance.CreateProps) {
    const battlefield = new Battlefield({ ...props.entity, autoconnect: false })
    const instance = new Instance({
      battlefield,
      entity: props.entity,
      pluginManager
    })
    if (props.entity.autostart) {
      try {
        await instance.start()
      } catch (e) {
        instance.log.warn(`could not connect to battlefield server with id ${instance.id} message: ${e.message}`)
      }
    }
    return instance
  }

}

export namespace Instance {

  export interface Props {
    battlefield: Battlefield,
    entity: InstanceEntity,
    serverinfo?: Battlefield.ServerInfo
    pluginManager: PluginManager
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
    RECONNECTING = 5
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
    "FrequencyMode", "SpectatorCount",
    "SunFlareEnabled", "ColorCorrectionEnabled",
    "TimeScale", "SpawnProtectionEnabled",
    "SquadSize"
  ]

  export const VAR_BF3_OPTIONAL = {
    ranked: false,
    unlockMode: 0
  }

  export const VAR_BF3_RANKED =  {
    gamePassword: false
  }

  export const VAR_SETTER_BF3 = [...VAR_BF3, ...Object.keys(VAR_BF3_OPTIONAL), ...Object.keys(VAR_BF3_RANKED)]
  export const VAR_SETTER_VU = [...VAR_VU]

}

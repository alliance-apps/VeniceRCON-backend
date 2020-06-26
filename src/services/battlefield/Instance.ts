import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Scopes } from "@service/permissions/Scopes"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"
import { PrependAction } from "../../util/PrependAction"
import winston from "winston"
import { Connection } from "./Connection"
import { pluginManager } from "@service/plugin"
import { InstancePlugin } from "@service/plugin/main/InstancePlugin"
import { PluginManager } from "@service/plugin/main/PluginManager"
import { Variable } from "vu-rcon/lib/Variable"
import { Player } from "@entity/Player"
import { ChatManager } from "./ChatManager"

export class Instance {

  readonly connection: Connection
  readonly state: InstanceContainer
  readonly plugin: InstancePlugin
  readonly chat: ChatManager
  private interval: any
  private intervalModulo = -1
  private syncInterval: number
  private playerListAction: PrependAction<Battlefield.PlayerList>

  constructor(props: Instance.Props) {
    this.state = new InstanceContainer({ entity: props.entity })
    this.syncInterval = props.entity.syncInterval
    this.connection = new Connection({
      battlefield: props.battlefield,
      instance: this
    })
    this.chat = new ChatManager({ instance: this })
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
      this.updateInterval()
    ])
  }

  /** stopts the update interval */
  private stopUpdateInterval() {
    this.playerListAction.pause()
    clearInterval(this.interval)
  }

  async getPlayerByName(name: string) {
    let player = await Player.findOne({ name })
    if (!player) {
      const p = Object.values(this.state.get("players")).find(p => p.name === name)
      if (!p) return undefined
      player = await Player.from(p)
    }
    return player
  }

  /** checks if the specified user has the specified scope for this instance */
  hasPermission(user: User|number, scope: Scopes) {
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
        //@ts-ignore
        ...Object.fromEntries(Object.keys(Instance.VAR_BF3_RANKED).map(k => [k, Instance.VAR_BF3_RANKED[k]]))
      }
    } else {
      result = {
        ...result,
        ...await Promise.all(Object.keys(Instance.VAR_BF3_RANKED).map(async key => [key, await this.connection.battlefield.var.get(key)]))
      }
    }
    this.state.updateVars(result)
    return result
  }

  /* gets the default battlefield variables */
  private async getVuVariables() {
    const result = Object.fromEntries(
      await Promise.all(Instance.VAR_VU.map(async key => [key, await this.connection.battlefield.var.get(key)]))
    )
    this.state.updateVars(result)
    return result
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
        winston.warn(`could not connect to battlefield server with id ${instance.id} message: ${e.message}`)
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
    "HighPerformanceReplication", "SetTeamTicketCount",
    "FrequencyMode", "SpectatorCount"
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
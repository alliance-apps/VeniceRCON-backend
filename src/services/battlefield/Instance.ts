import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Scopes } from "@service/permissions/Scopes"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"
import { PrependAction } from "../../util/PrependAction"
import winston from "winston"
import { Connection } from "./Connection"
import { Plugin } from "@service/plugin/libs/Plugin"
import { pluginManager } from "@service/plugin"

export class Instance {

  readonly connection: Connection
  readonly state: InstanceContainer
  private interval: any
  private intervalModulo = -1
  private syncInterval: number
  private playerListAction: PrependAction<Battlefield.PlayerList>
  plugins: Plugin[] = []

  constructor(props: Instance.Props) {
    this.state = new InstanceContainer({ entity: props.entity })
    this.syncInterval = props.entity.syncInterval
    this.connection = new Connection({
      battlefield: props.battlefield,
      instance: this
    })
    this.playerListAction = new PrependAction({
      shouldExecute: () => {
        const { slots } = this.getState().serverinfo
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

  /** reloads all plugins in this instance */
  async reloadPlugins() {
    await Promise.all(this.plugins.map(p => p.stop()))
    this.plugins = await pluginManager.getPluginsFromInstance(this)
  }

  /**
   * adds a new plugin to the instance
   * @param plugin
   */
  addPlugin(plugin: Plugin) {
    this.plugins.push(plugin)
    return this
  }

  /**
   * retrieves a single plugin for this instance
   * @param id id to find
   */
  getPlugin(id: number) {
    return this.plugins.find(p => p.id === id)
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

  /** retrieves a copy of the current state */
  getState() {
    return this.state.getState()
  }

  /** checks if the specified user has the specified scope for this instance */
  hasPermission(user: User|number, scope: Scopes) {
    return permissionManager.hasPermission({ instance: this.state.id, user, scope })
  }

  /** runs the update tick */
  private async updateInterval() {
    this.intervalModulo++
    if (this.intervalModulo % 60 === 0) {
      this.mapList()
    }
    await this.serverInfo()
  }

  /** starts the connection to the battlefield server */
  async start() {
    return this.connection.start()
  }

  /** disconnects to the battlefield instance */
  async stop() {
    await Promise.all(this.plugins.map(p => p.stop()))
    return this.connection.stop()
  }

  /** removes this instance */
  async remove() {
    await this.stop()
    this.battlefield.removeAllListeners()
    this.state.remove()
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
      entity: props.entity
    })
    await instance.reloadPlugins()
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

}
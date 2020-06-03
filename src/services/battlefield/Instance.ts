import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Scopes } from "@service/permissions/Scopes"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"
import { PrependAction } from "../../util/PrependAction"

export class Instance {

  readonly battlefield: Battlefield
  private readonly state: InstanceContainer
  private requestStop: boolean = false
  private interval: any
  private intervalModulo = -1
  private syncInterval: number
  private playerListAction: PrependAction<Battlefield.PlayerList>

  constructor(props: Instance.Props) {
    this.state = new InstanceContainer({ entity: props.entity })
    this.syncInterval = props.entity.syncInterval
    this.battlefield = props.battlefield
    this.registerPlayerEvents()
    this.playerListAction = new PrependAction({
      shouldExecute: () => {
        const { slots } = this.getState().serverinfo
        return Boolean(slots && slots > 0)
      },
      execute: () => this.playerList(),
      minimumInterval: this.syncInterval * 4,
      prependTimeout: this.syncInterval * 2
    })
    this.battlefield.on("close", async () => {
      this.stopUpdateInterval()
      if (this.requestStop) return
      await this.state.updateConnectionState(Instance.State.RECONNECTING)
      await this.battlefield.reconnect()
      this.state.updateConnectionState(Instance.State.CONNECTED)
      this.startUpdateInterval()
    })
  }

  /**
   * registers handler for player events
   */
  private registerPlayerEvents() {
    this.battlefield.on("playerLeave", event => {
      this.playerListAction.prepend()
      this.state.removePlayer(event.player.guid)
    })
    this.battlefield.on("playerAuthenticated", async event => {
      console.log("playerAuthenticated")
      console.log(await this.playerListAction.execute())
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

  private stopUpdateInterval() {
    this.playerListAction.pause()
    clearInterval(this.interval)
  }

  get id() {
    return this.state.id
  }

  getState() {
    return this.state.getState()
  }

  /**
   * checks if the specified user has the specified scope for this instance
   */
  hasPermission(user: User|number, scope: Scopes) {
    return permissionManager.hasPermission({ instance: this.state.id, user, scope })
  }

  private async updateInterval() {
    this.intervalModulo++
    if (this.intervalModulo % 60 === 0) {
      this.mapList()
    }
    await this.serverInfo()
  }

  /** connects to the battlefield instance */
  async start() {
    if (this.state.getState().state !== Instance.State.DISCONNECTED)
      throw new Error("instance is not in state disconnected")
    this.requestStop = false
    this.state.updateConnectionState(Instance.State.CONNECTING)
    try {
      await this.battlefield.connect()
    } catch (e) {
      this.state.updateConnectionState(Instance.State.DISCONNECTED)
      throw e
    }
    this.state.updateConnectionState(Instance.State.CONNECTED)
    await this.startUpdateInterval()
    return this
  }

  /** removes this instance */
  async remove() {
    await this.stop()
    this.battlefield.removeAllListeners()
    this.state.remove()
  }

  /** disconnects to the battlefield instance */
  async stop() {
    if (this.state.getState().state === Instance.State.DISCONNECTED) return this
    if (this.state.getState().state !== Instance.State.CONNECTED)
      throw new Error("instance is not in state connected")
    this.requestStop = true
    this.stopUpdateInterval()
    this.state.updateConnectionState(Instance.State.DISCONNECTING)
    await this.battlefield.quit()
    this.state.updateConnectionState(Instance.State.DISCONNECTED)
    return this
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

  static async from(props: Instance.CreateProps) {
    const battlefield = new Battlefield({ ...props.entity, autoconnect: false })
    const instance = new Instance({ battlefield, entity: props.entity })
    if (props.entity.autostart) {
      try {
        await instance.start()
      } catch (e) {
        console.log(`could not connect to battlefield server with id ${instance.id}`, e.message)
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
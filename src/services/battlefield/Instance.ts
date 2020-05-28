import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Scopes } from "@service/permissions/Scopes"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"

export class Instance {

  readonly battlefield: Battlefield
  private readonly state: InstanceContainer
  private requestStop: boolean = false
  private interval: any

  constructor(props: Instance.Props) {
    this.state = new InstanceContainer({ entity: props.entity })
    this.battlefield = props.battlefield
    this.battlefield.on("close", async () => {
      this.stopUpdateInterval()
      if (this.requestStop) return
      await this.state.updateConnectionState(Instance.State.RECONNECTING)
      await this.battlefield.reconnect()
      this.state.updateConnectionState(Instance.State.CONNECTED)
      this.startUpdateInterval()
    })
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
    await Promise.all([
      this.serverInfo(),
      this.playerList()
    ])
  }

  private async startUpdateInterval() {
    const entity = await InstanceEntity.findOne({ id: this.id })
    if (!entity) throw new Error(`could not find instance entity with id ${this.id} has the db entity been deleted?`)
    this.interval = setInterval(this.updateInterval.bind(this), entity.syncInterval)
    await this.updateInterval()
  }

  private stopUpdateInterval() {
    clearInterval(this.interval)
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
    this.state.remove()
  }

  /** disconnects to the battlefield instance */
  async stop() {
    if (this.state.getState().state == Instance.State.DISCONNECTED) return this
    if (this.state.getState().state !== Instance.State.CONNECTED)
      throw new Error("instance is not in state connected")
    this.requestStop = true
    this.stopUpdateInterval()
    this.state.updateConnectionState(Instance.State.DISCONNECTING)
    await this.battlefield.quit()
    this.state.updateConnectionState(Instance.State.DISCONNECTED)
    return this
  }

  /** retrieves the server info */
  async serverInfo() {
    const info = await this.battlefield.serverInfo()
    await this.state.updateServerInfo(info)
    return info
  }

  /** retrieves all connected players */
  async playerList() {
    const players = await this.battlefield.getPlayers()
    await this.state.updatePlayers(players)
    return players
  }

  static async from(props: Instance.CreateProps) {
    const battlefield = new Battlefield({ ...props.entity, autoconnect: false })
    const instance = new Instance({ battlefield, entity: props.entity })
    if (props.entity.autostart) await instance.start()
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
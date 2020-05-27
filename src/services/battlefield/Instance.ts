import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Scopes } from "@service/permissions/Scopes"
import { User } from "@entity/User"
import { permissionManager } from "@service/permissions"

export class Instance {

  readonly bf3: Battlefield
  private readonly state: InstanceContainer
  private requestStop: boolean = false
  private interval: any

  constructor(bf3: Battlefield, entity: InstanceEntity) {
    this.state = new InstanceContainer({ entity })
    this.bf3 = bf3
    this.bf3.on("close", async () => {
      this.stopUpdateInterval()
      if (this.requestStop) return
      await this.state.updateConnectionState(Instance.State.RECONNECTING)
      await this.bf3.reconnect()
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
    await this.serverInfo()
  }

  private startUpdateInterval() {
    this.interval = setInterval(this.updateInterval.bind(this), 1 * 1000)
    this.updateInterval()
  }

  private stopUpdateInterval() {
    clearInterval(this.interval)
  }

  /** connects to the battlefield instance */
  async start() {
    if (this.state.getState().state !== Instance.State.DISCONNECTED)
      throw new Error("instance is not in state disconnected")
    this.requestStop = false
    await this.state.updateConnectionState(Instance.State.CONNECTING)
    try {
      await this.bf3.connect()
    } catch (e) {
      await this.state.updateConnectionState(Instance.State.DISCONNECTED)
      throw e
    }
    await this.state.updateConnectionState(Instance.State.CONNECTED)
    this.startUpdateInterval()
    return this
  }

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
    await this.state.updateConnectionState(Instance.State.DISCONNECTING)
    await this.bf3.quit()
    await this.state.updateConnectionState(Instance.State.DISCONNECTED)
    return this
  }

  /** retrieves the server info */
  async serverInfo() {
    const info = await this.bf3.serverInfo()
    await this.state.updateServerInfo(info)
    return info
  }

  static async from(props: Instance.IProps, start: boolean = true) {
    const instance = new Instance(
      new Battlefield({
        ...props.entity,
        autoconnect: false
      }),
      props.entity
    )
    if (start) await instance.start()
    return instance
  }

}

export namespace Instance {

  export enum State {
    UNKNOWN = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    DISCONNECTING = 3,
    DISCONNECTED = 4,
    RECONNECTING = 5
  }

  export interface IProps {
    entity: InstanceEntity
  }

}
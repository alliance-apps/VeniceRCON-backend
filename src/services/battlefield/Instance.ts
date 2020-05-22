import { Battlefield } from "vu-rcon"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { createInstanceContainer, removeContainer } from "@service/container"

export class Instance {

  readonly bf3: Battlefield
  readonly container: ReturnType<typeof createInstanceContainer>
  private requestStop: boolean = false
  private interval: any

  constructor(bf3: Battlefield, entity: InstanceEntity) {
    this.container = createInstanceContainer({ entity })
    this.bf3 = bf3
    this.bf3.on("close", async () => {
      this.startUpdateInterval()
      if (this.requestStop) return
      await this.container.updateState(Instance.State.RECONNECTING)
      await this.bf3.reconnect()
      this.container.updateState(Instance.State.CONNECTED)
      this.startUpdateInterval()
    })
    this.start()
  }

  private async updateInterval() {
    await this.serverInfo()
  }

  private startUpdateInterval() {
    this.interval = setInterval(this.updateInterval.bind(this), 3 * 1000)
    this.updateInterval()
  }

  private stopUpdateInterval() {
    clearInterval(this.interval)
  }

  /** connects to the battlefield instance */
  async start() {
    if (this.container.get("state") !== Instance.State.DISCONNECTED)
      throw new Error("instance is not in state disconnected")
    this.requestStop = false
    await this.container.updateState(Instance.State.CONNECTING)
    await this.bf3.connect()
    await this.container.updateState(Instance.State.CONNECTED)
    this.startUpdateInterval()
    return this
  }

  async remove() {
    await this.stop()
    removeContainer(this.container)
  }

  /** disconnects to the battlefield instance */
  async stop() {
    if (this.container.get("state") == Instance.State.DISCONNECTED) return this
    if (this.container.get("state") !== Instance.State.CONNECTED)
      throw new Error("instance is not in state connected")
    this.requestStop = true
    this.stopUpdateInterval()
    await this.container.updateState(Instance.State.DISCONNECTING)
    await this.bf3.quit()
    await this.container.updateState(Instance.State.DISCONNECTED)
    return this
  }

  /** retrieves the server info */
  async serverInfo() {
    const info = await this.bf3.serverInfo()
    await this.container.updateServerInfo(info)
    return info
  }

  static async from(props: Instance.IProps) {
    return new Instance(
      new Battlefield({
        ...props.entity,
        autoconnect: false
      }),
      props.entity
    )
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
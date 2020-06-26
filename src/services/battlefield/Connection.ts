import { Battlefield } from "vu-rcon"
import { Instance } from "./Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"

export class Connection {
  readonly battlefield: Battlefield
  private readonly parent: Instance
  private requestStop: boolean = false

  constructor(props: Connection.Props) {
    this.battlefield = props.battlefield
    this.parent = props.instance
    this.battlefield.on("close", async () => {
      if (this.requestStop) return
      await this.state.updateConnectionState(Instance.State.RECONNECTING)
      await this.battlefield.reconnect()
      this.state.updateConnectionState(Instance.State.CONNECTED)
    })
  }

  get state() {
    return this.parent.state
  }

  /** connects to the battlefield instance */
  async start() {
    if (this.state.get("state") !== Instance.State.DISCONNECTED)
      throw new Error("instance is not in state disconnected")
    this.requestStop = false
    this.state.updateConnectionState(Instance.State.CONNECTING)
    try {
      await this.battlefield.connect()
      try {
        await this.checkServerVersion()
      } catch(e) {
        this.battlefield.quit()
        throw e
      }
    } catch (e) {
      this.state.updateConnectionState(Instance.State.DISCONNECTED)
      throw e
    }
    this.state.updateConnectionState(Instance.State.CONNECTED)
    return this
  }

  async stop() {
    if (this.state.get("state") === Instance.State.DISCONNECTED) return this
    if (this.state.get("state") !== Instance.State.CONNECTED)
      throw new Error("instance is not in state connected")
    this.requestStop = true
    this.state.updateConnectionState(Instance.State.DISCONNECTING)
    await this.battlefield.quit()
    this.state.updateConnectionState(Instance.State.DISCONNECTED)
    return this
  }

  private async checkServerVersion() {
    try {
      await this.battlefield.getMods()
      this.state.updateGameVersion(InstanceContainer.Version.VU)
    } catch (e) {
      if (this.battlefield.version.game !== InstanceContainer.Version.BF3 as string)
       throw new Error(`unsupported game ${this.battlefield.version.game}`)
      this.state.updateGameVersion(InstanceContainer.Version.BF3)
    }
  }
}

export namespace Connection {
  export interface Props {
    battlefield: Battlefield
    instance: Instance
  }
}
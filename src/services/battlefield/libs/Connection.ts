import { Battlefield } from "vu-rcon"
import { Instance } from "./Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { socketManager } from "@service/koa/socket"
import { InstanceScope } from "@service/permissions/Scopes"
import { Word } from "vu-rcon/lib/transport/protocol/Word"
import { SocketManager } from "@service/koa/socket/SocketManager"
import chalk from "chalk"
import { EventEmitter } from "typeorm/platform/PlatformTools"
import { ReconnectEvent } from "vu-rcon/lib/types/Event"

export interface Connection {
  on(event: "connected"|"disconnected", handler: () => void): this
}

export class Connection extends EventEmitter {

  static RECONNECT_ATTEMPTS = 100
  static RECONNECT_TIMEOUT = 10 * 1000
  readonly battlefield: Battlefield
  private readonly parent: Instance
  private requestStop: boolean = false

  constructor(props: Connection.Props) {
    super()
    this.battlefield = props.battlefield
    this.parent = props.instance
    this.battlefield.on("error", this.onError.bind(this))
    this.battlefield.on("reconnect", this.onReconnect.bind(this))
    this.battlefield.on("close", this.onClose.bind(this))
    this.battlefield.on("sendData", ({ words }) => this.publishSocketEvent("send", words))
    this.battlefield.on("receiveData", ({ words }) => this.publishSocketEvent("receive", words))
  }

  /** handles a reconnect event from the server */
  private async onReconnect({ success, attempt }: ReconnectEvent) {
    if (!success) return
    this.parent.log.warn(`reconnect attempt ${attempt}/${Connection.RECONNECT_ATTEMPTS} failed`)
  }

  /** handles error events from the socket */
  private async onError(error: Error) {
    this.parent.log.error(`received error from battlefield socket ${error.message}`)
    this.battlefield.quit()
  }

  /** handles connections closed to the battlefield server */
  private async onClose() {
    //checks if closing of connection has been requested
    if (this.requestStop) {
      const { host, port } = this.battlefield.options
      this.parent.log.info(`disconnected from ${chalk.bold(`${host}:${port}`)}!`)
      this.updateConnectionState(Instance.State.DISCONNECTED)
      return
    }
    //handle reconnect since connection close has not been requested
    this.parent.log.warn("battlefield server disconnected, reconnecting...")
    await this.updateConnectionState(Instance.State.RECONNECTING)
    try {
      await this.battlefield.reconnect(Connection.RECONNECT_ATTEMPTS, Connection.RECONNECT_TIMEOUT)
    } catch (e) {
      this.parent.log.error(`was not able to reconnect to the battlefield server after ${Connection.RECONNECT_ATTEMPTS} attempts!`)
      this.updateConnectionState(Instance.State.RECONNECTING_FAILED)
      return
    }
    this.parent.log.info("battlefield server reconnected!")
    this.updateConnectionState(Instance.State.CONNECTED)
  }

  /**
   * updates the connection state of the instance and emits events
   * @param state the current connection state
   */
  private updateConnectionState(state: Instance.State) {
    switch (state) {
      case Instance.State.CONNECTED:
        this.emit("connected")
        break
      case Instance.State.RECONNECTING:
      case Instance.State.DISCONNECTED:
        this.emit("disconnected")
        break
    }
    this.state.updateConnectionState(state)
  }

  private publishSocketEvent(type: "send"|"receive", words: Word[]) {
    socketManager
      .subscribedTo(this.parent.id)
      .hasPermission(this.parent.id, InstanceScope.CONSOLE)
      .emit(
        SocketManager.INSTANCE.CONSOLE,
        { id: this.parent.id, type, words: words.map(w => w.toString()) }
      )
  }

  get state() {
    return this.parent.state
  }

  /** connects to the battlefield instance */
  async start() {
    const startStates = [
      Instance.State.DISCONNECTED,
      Instance.State.RECONNECTING_FAILED
    ]
    if (!startStates.includes(this.state.get("state")))
      throw new Error(`instance is not in correct state! (state: ${this.state.get("state")})`)
    this.requestStop = false
    this.updateConnectionState(Instance.State.CONNECTING)
    try {
      const { host, port } = this.battlefield.options
      this.parent.log.info(`connecting to ${chalk.bold(`${host}:${port}`)}...`)
      await this.battlefield.connect()
      this.parent.log.info(`connected to ${chalk.bold(`${host}:${port}`)}!`)
      try {
        await this.checkServerVersion()
      } catch(e) {
        this.battlefield.quit()
        throw e
      }
    } catch (e) {
      this.updateConnectionState(Instance.State.DISCONNECTED)
      throw e
    }
    this.updateConnectionState(Instance.State.CONNECTED)
    return this
  }

  /** stops and disconnects the instance */
  async stop() {
    this.requestStop = true
    this.updateConnectionState(Instance.State.DISCONNECTING)
    const { host, port } = this.battlefield.options
    this.parent.log.info(`disconnecting from ${chalk.bold(`${host}:${port}`)}...`)
    await this.battlefield.quit()
    return this
  }

  /** tries to detect the server type the instance is running on */
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
import { Battlefield } from "vu-rcon"
import { EventError } from "vu-rcon/lib/exceptions/EventError"
import { Instance } from "./Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { socketManager } from "@service/koa/socket"
import { InstanceScope } from "@service/permissions/Scopes"
import { Word } from "vu-rcon/lib/transport/protocol/Word"
import chalk from "chalk"
import { EventEmitter } from "typeorm/platform/PlatformTools"
import { ReconnectEvent } from "vu-rcon/lib/types/Event"

export interface Connection {
  on(event: "connected"|"disconnected", handler: () => void): this
}

export class Connection extends EventEmitter {

  static RECONNECT_ATTEMPTS = 60
  static RECONNECT_TIMEOUT = 10 * 1000
  static RECONNECT_STEP_INCREASE = 10 * 1000
  static UNSTABLE_CONNECTION_TIMEOUT = 2 * 60 * 1000
  static UNSTABLE_CONNECTION_RETRY = 10

  battlefield: Battlefield
  private readonly parent: Instance
  private requestStop: boolean = false
  private reconnectErrors: number = 0
  private reconnectErrorsReset: any

  constructor(props: Connection.Props) {
    super()
    this.battlefield = new Battlefield({
      ...props.options, autoconnect: false
    })
    this.parent = props.instance
    this.registerEvents()
  }

  private registerEvents() {
    this.battlefield.on("error", this.onError.bind(this))
    this.battlefield.on("reconnect", this.onReconnect.bind(this))
    this.battlefield.on("close", this.onClose.bind(this))
    this.battlefield.on("requestReceive", ({ request }) => this.publishSocketEvent("receive", request.getContentWords()))
    this.battlefield.on("requestSend", ({ request }) => this.publishSocketEvent("send", request.packet.words))
  }

  /** handles a reconnect event from the server */
  private async onReconnect(event: ReconnectEvent) {
    if (event.success) return
    this.parent.log.warn(`reconnect attempt ${event.attempt}/${event.maxAttempts} failed retrying in ${Math.floor(event.nextAttemptIn/1000)}s`)
  }

  /** handles error events from the socket */
  private async onError(error: Error) {
    if (error instanceof EventError) {
      this.parent.log.warn(`event handler in battlefield had an error in event ${error.event}: ${error.message}`)
    } else {
      this.parent.log.error(`received error from battlefield socket: ${error.message}`)
      this.battlefield.quit()
    }
  }

  private incrementReconnect() {
    clearTimeout(this.reconnectErrorsReset)
    this.reconnectErrors++
    this.reconnectErrorsReset = setTimeout(
      () => this.reconnectErrors = 0,
      Connection.UNSTABLE_CONNECTION_TIMEOUT
    )
  }

  private isUnstable() {
    return this.reconnectErrors > Connection.UNSTABLE_CONNECTION_RETRY
  }

  /** handles connections closed to the battlefield server */
  private async onClose() {
    this.incrementReconnect()
    //checks if closing of connection has been requested
    if (this.requestStop) {
      const { host, port } = this.battlefield.options
      this.parent.log.info(`disconnected from ${chalk.bold(`${host}:${port}`)}`)
      this.updateConnectionState(Instance.State.DISCONNECTED)
      return
    }
    if (this.isUnstable()) {
      this.parent.log.error("connection considered unstable stopping reconnect attempts")
      this.requestStop = true
      await this.parent.setAutostart(false)
      return
    }
    //handle reconnect since connection close has not been requested
    this.parent.log.warn("battlefield server disconnected, reconnecting...")
    await this.updateConnectionState(Instance.State.RECONNECTING)
    try {
      await this.battlefield.reconnect(
        Connection.RECONNECT_ATTEMPTS,
        Connection.RECONNECT_TIMEOUT,
        Connection.RECONNECT_STEP_INCREASE
      )
    } catch (e) {
      this.updateConnectionState(Instance.State.RECONNECTING_FAILED)
      await this.parent.setAutostart(false)
      this.parent.log.error(`was not able to reconnect to the battlefield server after ${Connection.RECONNECT_ATTEMPTS} attempts!`)
      return
    }
    this.parent.log.info("battlefield server reconnected")
    this.updateConnectionState(Instance.State.CONNECTED)
  }

  /**
   * updates the connection state of the instance and emits events
   * @param state the current connection state
   */
  private updateConnectionState(state: Instance.State) {
    if (this.state.get("state") === state) return
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
      .emitConsoleMessage({ id: this.parent.id, type, words: words.map(w => w.toString()) })
  }

  /**
   * updates the connection information
   * @param props new connection credentials
   */
  async updateConnection(props: Battlefield.Options) {
    if (!this.parent.isDisconnected)
      throw new Error(`instance is not in correct state! (state: ${this.state.get("state")})`)
    this.battlefield.quit()
    this.battlefield.removeAllListeners()
    this.battlefield = new Battlefield({ ...props, autoconnect: false })
    this.registerEvents()
  }

  get state() {
    return this.parent.state
  }

  /** connects to the battlefield instance */
  async start() {
    if (!this.parent.isDisconnected)
      throw new Error(`can not start: instance is not in correct state (${this.state.get("state")})`)
    this.updateConnectionState(Instance.State.CONNECTING)
    const { host, port } = this.battlefield.options
    try {
      this.parent.log.info(`connecting to ${chalk.bold(`${host}:${port}`)}...`)
      await this.battlefield.connect()
      await this.checkServerVersion()
      this.requestStop = false
      this.parent.log.info(`connected to ${chalk.bold(`${host}:${port}`)}!`)
      this.updateConnectionState(Instance.State.CONNECTED)
      await this.parent.setAutostart(true)
    } catch (e) {
      this.parent.log.info(`failed to connect to ${chalk.bold(`${host}:${port}`)}!`)
      this.battlefield.quit()
      await this.parent.setAutostart(false)
      this.updateConnectionState(Instance.State.DISCONNECTED)
      throw e
    }
    return this
  }

  /** stops and disconnects the instance */
  async stop() {
    if (this.parent.isDisconnected) return
    this.requestStop = true
    this.battlefield.abortReconnect()
    this.updateConnectionState(Instance.State.DISCONNECTING)
    const { host, port } = this.battlefield.options
    this.parent.log.info(`disconnecting from ${chalk.bold(`${host}:${port}`)}...`)
    await this.battlefield.quit()
    this.updateConnectionState(Instance.State.DISCONNECTED)
    await this.parent.setAutostart(false)
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
    options: Battlefield.Options
    instance: Instance
  }
}
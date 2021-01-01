import { MessageChannel, MessagePort } from "worker_threads"
import { EventEmitter } from "events"
import { Message } from "./Message"

export interface Messenger {
  on(event: string, cb: (event: Messenger.Event) => void): this
}

export class Messenger extends EventEmitter {
  private id: number = 0
  private acks: Record<number, Messenger.AcknowledgeItem> = {}
  private port: MessagePort
  private resolver: Messenger.Ready

  constructor(props: Messenger.Props) {
    super()
    this.port = props.port
    this.port.on("message", this.onData.bind(this))
    const { ready } = props
    if (ready) {
      const resolver: Partial<Messenger.Ready> = {}
      resolver.ready = new Promise<any>((fulfill, reject) => {
        resolver.fulfill = fulfill
        resolver.reject = reject
      })
      resolver.ready.then(() => ready()).catch(err => ready(err))
      this.resolver = resolver as Messenger.Ready
      setTimeout(() => {
        if (this.resolver.resolved) return
        this.resolver.resolved = true
        this.resolver.reject!(new Error("timeout while creating message port"))
      }, 1000)
    } else {
      this.resolver = { resolved: true, ready: Promise.resolve() }
      this.port.postMessage({ type: Messenger.MessageType.READY })
    }
  }

  /** send data */
  send<T = any>(action: string, data?: T, timeout: number = 2000) {
    const { id, promise } = this.createAcknowledgeItem(timeout, JSON.stringify({ action, data }))
    this.post({ type: Messenger.MessageType.DATA, id, action, data })
    return promise
  }

  sendAck(id: number, data?: any) {
    return this.post({ type: Messenger.MessageType.ACK, id, data })
  }

  sendErrorAck(id: number, message: string, stack?: string) {
    return this.post({ type: Messenger.MessageType.ERROR_ACK, id, message, stack })
  }

  /** receive data from the message port */
  private onData(ev: Messenger.MessageData) {
    switch (ev.type) {
      case Messenger.MessageType.READY: return this.handleReady()
      case Messenger.MessageType.ACK: return this.handleAck(ev)
      case Messenger.MessageType.ERROR_ACK: return this.handleErrorAck(ev)
      case Messenger.MessageType.DATA: return this.handleMessage(ev)
    }
  }

  /** send data to the other side */
  private async post(data: Messenger.MessageData) {
    await this.resolver.ready
    this.port.postMessage({ ...data })
  }

  /** handles the ready message */
  private handleReady() {
    if (this.resolver.resolved)
      throw new Error("received ready event twice")
    if (!this.resolver.fulfill)
      throw new Error("this messengers has no fulfill")
    this.resolver.resolved = true
    return this.resolver.fulfill()
  }

  /** removes an acknowledge item and  */
  private removeAcknowledgeItem(id: number) {
    const item = this.acks[id]
    if (!item) throw new Error(`received unknown acknowledge for ${id}`)
    clearTimeout(item.timeout)
    delete this.acks[id]
    return item
  }

  /** handles an incoming acknowledge message */
  private handleAck(ev: Messenger.AckMessage) {
    this.removeAcknowledgeItem(ev.id).fulfill(ev.data)
  }

  /** handles an incoming acknowledge message with an exception */
  private handleErrorAck(ev: Messenger.ErrorAckMessage) {
    const error = new Error(ev.message)
    error.stack = [error.stack!.split("\n")[0], ...(ev.stack||"").split("\n").slice(1)].join("\n")
    this.removeAcknowledgeItem(ev.id).reject(error)
  }

  /** handles an incoming message */
  private handleMessage(ev: Messenger.DataMessage) {
    const message = new Message({ messenger: this, message: ev })
    this.emit(ev.action, { message })
    this.emit("*", { message })
  }

  /** creates an acknowledgeable item */
  private createAcknowledgeItem(timeout: number, meta: string): Messenger.AcknowledgeItem {
    const id = this.id++
    const item: Partial<Messenger.AcknowledgeItem> = { id }
    item.promise = new Promise<any>((fulfill, reject) => {
      item.fulfill = fulfill
      item.reject = reject
      item.timeout = setTimeout(() => reject(new Error(`message timeout: id=${id} meta=${meta}`)), timeout)
    })
    this.acks[id] = item as Messenger.AcknowledgeItem
    return this.acks[id]
  }

  /** creates a new messenger instance and sends the port via a given channel */
  static create(sendPort: (port: MessagePort) => void) {
    const promise = new Promise<Messenger>((fulfill, reject) => {
      const { port1, port2 } = new MessageChannel()
      const messenger: Messenger = new Messenger({
        port: port1,
        ready: (err) =>  err ? reject(err) : fulfill(messenger)
      })
      sendPort(port2)
    })
    return promise
  }

}

export namespace Messenger {

  export interface Props {
    port: MessagePort
    ready?: (err?: Error) => void
  }

  export interface Event<T = any> {
    message: Message<T>
  }

  export interface Ready {
    resolved: boolean
    ready: Promise<void>
    fulfill?: (data: void) => void
    reject?: (err: Error) => void
  }

  export interface AcknowledgeItem {
    id: number
    promise: Promise<any>
    fulfill: (data: any) => void
    reject: (err: Error) => void
    timeout: any
  }

  export enum MessageType {
    ACK = "ACK",
    ERROR_ACK = "ERR_ACK",
    DATA = "DATA",
    READY = "READY"
  }

  export type MessageData =
    AckMessage |
    ErrorAckMessage |
    DataMessage |
    ReadyMessage

  export interface ReadyMessage {
    type: MessageType.READY
    action: void
  }

  export interface AckMessage {
    type: MessageType.ACK
    action?: string
    id: number
    data: any
  }

  export interface ErrorAckMessage {
    type: MessageType.ERROR_ACK
    id: number
    message: string
    stack: string|undefined
  }

  export interface DataMessage {
    type: MessageType.DATA
    action: string
    data: any
    id: number
  }

}
import { MessageChannel, MessagePort } from "worker_threads"
import winston from "winston"

export class Messenger {
  private ackId: number = 0
  private acks: Record<number, any> = {}
  private port: MessagePort
  private promise: Messenger.Ready

  constructor(props: Messenger.Props) {
    this.port = props.port
    this.port.on("message", this.onData.bind(this))
    if (props.ready && props.reject) {
      const ready: Partial<Messenger.Ready> = { resolved: false }
      ready.ready = new Promise((fulfill, reject) => {
        ready.fulfill = fulfill
        ready.reject = reject
      })
      this.promise = ready as Messenger.Ready
      setTimeout(() => {
        if (this.promise.resolved) return
        this.promise.resolved = true
        this.promise.reject!(new Error("timeout while creating message port"))
      }, 1000)
    } else {
      this.promise = { resolved: true, ready: Promise.resolve() }
      this.port.postMessage({ type: Messenger.MessageType.READY })
    }
  }

  send<T = any>(action: string, data: T) {
    return this.post(<Messenger.DataMessage>{
      type: Messenger.MessageType.DATA,
      action,
      data
    })
  }

  private onData(data: Messenger.Message) {
    switch (data.type) {
      case Messenger.MessageType.READY:
        if (this.promise.resolved)
          throw new Error("received ready event twice")
        if (!this.promise.fulfill)
          throw new Error("this messengers has no fulfill")
        this.promise.resolved = true
        return this.promise.fulfill()
      case Messenger.MessageType.ACK:
        const { ackId } = data
        if (!this.acks[ackId])
          throw new Error(`received unknown acknowledge ${ackId} for action ${data.action}`)
        clearTimeout(this.acks[ackId])
        return delete this.acks[ackId]
    }
  }

  private async post(data: Omit<Messenger.Message, "ackId">, timeout: number = 500) {
    await this.promise.ready
    const id = this.ackId++
    this.acks[id] = setTimeout(() => {
      winston.warn(`no acknowledge for message id ${id} received (action: ${data.action})`)
    }, timeout)
    return this.port.postMessage({ ...data, id })
  }

  static create(sendPort: (port: MessagePort) => void, timeout: number = 1000) {
    const promise = new Promise<Messenger>((fulfill, reject) => {
      const { port1, port2 } = new MessageChannel()
      const messenger: Messenger = new Messenger({
        port: port1,
        ready: () => fulfill(messenger),
        reject
      })
      sendPort(port2)
    })
    return promise
  }

}

export namespace Messenger {

  export interface Props {
    port: MessagePort
    ready?: () => void
    reject?: (err: Error) => void
  }

  export interface Ready {
    resolved: boolean
    ready: Promise<void>
    fulfill?: () => void
    reject?: (err: Error) => void
  }

  export enum MessageType {
    ACK = "ACK",
    DATA = "DATA",
    READY = "READY"
  }

  export type Message =
    AckMessage |
    DataMessage |
    ReadyMessage

  export interface ReadyMessage {
    type: MessageType.READY
    action: void
  }

  export interface AckMessage {
    type: MessageType.ACK
    action: string
    ackId: number
  }

  export interface DataMessage {
    type: MessageType.DATA
    action: string
    data: any
  }

}
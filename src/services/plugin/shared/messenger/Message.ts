import { Messenger } from "./Messenger"

export class Message<T = any> {

  private parent: Messenger
  private message: Messenger.DataMessage

  constructor(props: Message.Props) {
    this.parent = props.messenger
    this.message = props.message
  }

  get id() {
    return this.message.id
  }

  get action() {
    return this.message.action
  }

  get data(): T {
    return this.message.data
  }

  /** acknowledges the message */
  done(data?: any) {
    return this.parent.sendAck(this.id, data)
  }

  /** acknowledges the message with an error */
  except(message: string) {
    return this.parent.sendErrorAck(this.id, message, new Error().stack)
  }
}

export namespace Message {
  export interface Props {
    messenger: Messenger
    message: Messenger.DataMessage
  }
}
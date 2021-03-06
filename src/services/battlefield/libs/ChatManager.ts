import { Instance } from "./Instance"
import { ChatMessage } from "@entity/ChatMessage"
import { socketManager } from "@service/koa/socket"
import { EventScope } from "@service/permissions/Scopes"
import { PlayerOnChat } from "vu-rcon/lib/types/Event"

export class ChatManager {

  private parent: Instance
  private messages: ChatMessage[] = []

  constructor(props: ChatManager.Props) {
    this.parent = props.instance
    this.initialize()
  }

  private get resolver() {
    return this.parent.nameResolver
  }

  private get id() {
    return this.parent.id
  }

  private get battlefield() {
    return this.parent.battlefield
  }

  /**
   * retrieves x messages from a certain date
   * @param count amount of messages to retrieve
   * @param from get messages from a specific date
   */
  async getMessages(
    count: number = ChatManager.MESSAGECOUNT,
    from: number|Date = Date.now()
  ) {
    const date = from instanceof Date ? from : new Date(from)
    const messages = this.messages.filter(msg => msg.created < date)
    if (messages.length > count) return messages.slice(0, count)
    if (messages.length === count) return messages
    return ChatMessage.getMessages(this.id, count, date)
  }

  private async addMessage(message: ChatMessage) {
    this.messages = [...this.messages, message].slice(ChatManager.MESSAGECOUNT * -1)
    socketManager.hasPermission(this.id, EventScope.CHAT).emitChatMessages([message])
  }

  private async initialize() {
    this.messages = await this.getMessages()
    this.battlefield.on("chat", this.onMessage.bind(this))
  }

  private async onMessage(ev: PlayerOnChat) {
    let player: number|undefined
    if (ev.player.toLowerCase() !== "server") {
      player = (await this.resolver.get(ev.player)).id
    }
    this.addMessage(await ChatMessage.from({
      instance: this.id,
      player,
      displayName: ev.player,
      message: ev.msg,
      subset: ev.subset
    }))
  }
}

export namespace ChatManager {

  export const MESSAGECOUNT = 50

  export interface Props {
    instance: Instance
  }
}
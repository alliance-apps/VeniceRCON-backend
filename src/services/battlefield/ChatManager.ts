import { Instance } from "./Instance"
import { ChatMessage } from "@entity/ChatMessage"
import { Player } from "@entity/Player"
import { MoreThan } from "typeorm"
import { socketManager } from "@service/koa/socket"
import { EventScope } from "@service/permissions/Scopes"

export class ChatManager {

  private parent: Instance
  private messages: ChatMessage[] = []

  constructor(props: ChatManager.Props) {
    this.parent = props.instance
    this.initialize()
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
    if (messages.length === count || this.messages.length < ChatManager.MESSAGECOUNT) return messages
    return ChatMessage.find({
      where: {
        created: MoreThan(date.getTime()),
        instanceId: this.id
      },
      order: { created: "DESC" },
      take: count
    })
  }

  private async addMessage(message: ChatMessage) {
    this.messages = [...this.messages, message].slice(ChatManager.MESSAGECOUNT * -1)
    socketManager.hasPermission(this.id, EventScope.CHAT).emitChatMessages([message])
  }

  private async initialize() {
    this.messages = await ChatMessage.find({ where: { instanceId: this.id }, take: ChatManager.MESSAGECOUNT })
    this.battlefield.on("chat", async ev => {
      let player: Player|undefined
      if (ev.player !== "server") {
        player = await this.parent.getPlayerByName(ev.player)
      }
      this.addMessage(await ChatMessage.from({
        instance: this.id,
        player,
        displayName: ev.player,
        message: ev.msg,
        subset: ev.subset
      }))
    })
  }
}

export namespace ChatManager {

  export const MESSAGECOUNT = 50

  export interface Props {
    instance: Instance
  }
}
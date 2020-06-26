import { Instance } from "./Instance"
import { ChatMessage } from "@entity/ChatMessage"
import { Player } from "@entity/Player"

export class ChatManager {

  private parent: Instance

  constructor(props: ChatManager.Props) {
    this.parent = props.instance
  }

  private get id() {
    return this.parent.id
  }

  private get battlefield() {
    return this.parent.battlefield
  }

  private registerEvent() {
    this.battlefield.on("chat", async ev => {
      let player: Player|undefined
      if (ev.player !== "server") {
        
      }
      const message = ChatMessage.from({
        instance: this.id,
        player,
        message: ev.msg,
        subset: ev.subset
      })
    })
  }
}

export namespace ChatManager {
  export interface Props {
    instance: Instance
  }
}
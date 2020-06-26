import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Player } from "./Player"
import { Instance } from "./Instance"

@Entity()
export class ChatMessage extends AbstractEntity<ChatMessage> {

  protected entityClass = ChatMessage

  @ManyToOne(
    type => Player,
    player => player.chats,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  player?: Player

  @Column({ nullable: true })
  playerId?: number

  @ManyToOne(
    type => Instance,
    instance => instance.messages,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  instance?: Instance

  @Column({ nullable: true })
  instanceId?: number

  @Column()
  displayName!: string

  @Column()
  message!: string

  @Column()
  subset!: string

  setPlayer(player: Player|number) {
    return this.setRelation("player", player)
  }

  setInstance(instance: Instance|number) {
    return this.setRelation("instance", instance)
  }

  /** creates a new instance */
  static async from(props: ChatMessage.ICreate) {
    const msg = new ChatMessage()
    msg.message = props.message
    msg.subset = props.subset
    msg.displayName = props.displayName
    await msg.save()
    await Promise.all([
      props.player ? msg.setPlayer(props.player) : Promise.resolve(),
      msg.setInstance(props.instance)
    ])
    await msg.reload()
    return msg
  }

}

export namespace ChatMessage {

  export interface ICreate {
    instance: Instance|number
    player?: Player|number
    displayName: string
    message: string
    subset: string
  }
}
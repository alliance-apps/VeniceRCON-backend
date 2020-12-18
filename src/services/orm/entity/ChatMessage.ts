import { Entity, Column, ManyToOne, LessThan } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Player } from "./Player"
import { Instance } from "./Instance"

@Entity()
export class ChatMessage extends AbstractEntity<ChatMessage> {

  protected entityClass = ChatMessage

  @ManyToOne(
    type => Player, player => player.chats,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  player?: Player

  @Column({ nullable: true })
  playerId?: number

  @ManyToOne(
    type => Instance, instance => instance.messages,
    { cascade: true, onDelete: "CASCADE" }
  )
  instance!: Promise<Instance>

  @Column()
  instanceId!: number

  @Column()
  displayName!: string

  @Column()
  message!: string

  @Column()
  subset!: string

  async toJSON() {
    const player = await this.player
    return {
      id: this.id,
      instance: this.instanceId,
      name: this.displayName,
      message: this.message,
      subset: this.subset,
      created: this.created,
      player: player ? {
        name: player.name,
        guid: player.guid
      } : undefined
    }
  }

  /** creates a new instance */
  static async from(props: ChatMessage.ICreate) {
    const msg = new ChatMessage()
    msg.message = props.message
    msg.subset = props.subset
    msg.displayName = props.displayName
    msg.instanceId = AbstractEntity.fetchId(props.instance)
    if (props.player) msg.playerId = AbstractEntity.fetchId(props.player)
    return msg.save()
  }

  static getMessages(
    instanceId: number,
    count: number = 10,
    from: number|Date = Date.now()
  ) {
    const date = from instanceof Date ? from : new Date(from)
    return this.createQueryBuilder()
      .select()
      .where({ created: LessThan(date.toISOString()), instanceId })
      .orderBy({ created: "DESC" })
      .limit(count)
      .getMany()
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
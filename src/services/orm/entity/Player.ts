import { Entity, Column, OneToMany, ManyToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { ChatMessage } from "./ChatMessage"
import { Kill } from "./Kill"
import winston from "winston"
import { User } from "./User"
import util from "util"

@Entity()
export class Player extends AbstractEntity<Player> {

  protected entityClass = Player

  @Column({ unique: true })
  guid!: string

  @Column()
  name!: string

  @OneToMany(type => ChatMessage, msg => msg.player)
  chats!: Promise<ChatMessage>

  @OneToMany(type => Kill, kill => kill.killer)
  kills!: Promise<Kill[]>

  @OneToMany(type => Kill, kill => kill.killed)
  killed!: Promise<Kill[]>

  @ManyToMany(() => User, user => user.players)
  users!: Promise<User[]>

  /** creates a new instance */
  static async from(props: Player.ICreate) {
    const player = new Player()
    player.guid = props.guid
    player.name = props.name
    return player.save()
  }

  /** gets a list of ids by the name */
  static async findByName(name: string): Promise<{ id: number, guid: string, name: string }> {
    return Player
      .createQueryBuilder()
      .select("id, guid, name")
      .where({ name })
      .getRawOne()
  }

  /**
   * tries to savely create a player
   * @param props
   */
  static async createPlayerSave({ guid, name }: { guid: string, name: string }) {
    try {
      return await Player.from({ guid, name })
    } catch (e) {
      if (e.constructor.name === "QueryFailedError" && ["ER_DUP_ENTRY", "23505"].includes(e.code)) {
        let player = await Player.findOne({ name })
        if (player) return player
        player = await Player.findOne({ guid })
        if (player) {
          winston.warn(`client was not found by name but guid has been found and player name is ${player.name} replacing correct name in database...`)
          player.name = name
          await player.save()
          return player
        } else {
          winston.warn(`well shit neither guid "${guid}" nor name "${name}" is on the server but still gives an unique constraint error`)
        }
        winston.error(`tried to find player after duplicate key entry, but was unable to find him "${name}"`)
        winston.error(util.inspect(e, { depth: 4 }))
        throw e
      } else {
        winston.error("Could not insert player in getPlayerIds")
        winston.error(util.inspect(e, {depth: 4}))
        throw e
      }
    }
  }

}

export namespace Player {

  export interface ICreate {
    guid: string
    name: string
  }
}
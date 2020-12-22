import { Entity, Column, OneToMany, In, ManyToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { ChatMessage } from "./ChatMessage"
import { Kill } from "./Kill"
import { Battlefield } from "vu-rcon"
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
  static async findIdsByName(names: string[]): Promise<{ id: number, name: string }[]> {
    return Player
      .createQueryBuilder()
      .select("id, name")
      .where({ name: In(names) })
      .getRawMany()
  }

  /** retrieves multiple player ids by their name and indexes them by an identifier */
  static async getPlayerIds(
    names: Record<string, string|undefined>,
    retrieve: (name: string) => Promise<Battlefield.Player|undefined>
  ): Promise<Record<string, number|undefined>> {
    //create the initial response data
    const result: Record<string, number|undefined> = Object.fromEntries(Object.keys(names).map(id => [id, undefined]))
    //retrieve all names which should be retrieves
    const filtered = Object.keys(names)
      .filter(id => typeof names[id] === "string")
      //retrieves all names which should be fetched from database
      .reduce((acc, id) => acc.includes(names[id] as string) ? acc : [...acc, names[id] as string], [] as string[])
    //gets a list of players in the database
    const players = await Player.findIdsByName(filtered)
    //gets a list of all players which have not been found in the database
    const inserts = filtered
      //checks if a name has not been found
      .filter(name => !players.some(p => p.name === name))
      //do not insert duplicates
      .reduce((acc, name) => acc.includes(name) ? acc : [...acc, name], [] as string[])
    //insert all players which are not in our database
    await Promise.all(inserts.map(async name => {
      const data = await retrieve(name)
      if (!data) return winston.verbose(`could not find player with name "${name}" in retrieve`)
      try {
        players.push(await Player.from({
          guid: data.playerGuid || data.guid,
          name: data.name
        }))
      } catch (e) {
        if (e.constructor.name === "QueryFailedError" && e.code === "23505") {
          let player = await Player.findOne({ name })
          if (!player) {
            player = await Player.findOne({ guid: data.playerGuid || data.guid })
            if (player) {
              winston.warn(`client was not found by name but guid has been found and player name is ${player.name} replacing correct name in database...`)
              player.name = data.name
              await player.save()
              return players.push(player)
            } else {
              winston.warn(`well shit neither guid "${data.playerGuid || data.guid}" nor name "${data.name}" is on the server but still gives an unique constraint error`)
            }
            winston.verbose(`tried to find player after duplicate key entry, but was unable to find him "${name}"`)
            winston.verbose(util.inspect(e, { depth: 4 }))
            throw e
          }
          players.push(player)
        } else {
          winston.verbose("Could not insert player in getPlayerIds")
          winston.verbose(util.inspect(e, {depth: 4}))
          throw e
        }
      }
    }))
    Object.keys(names).forEach(id => {
      const player = players.find(player => player.name === names[id])
      if (!player) return
      result[id] = player.id
    })
    return result


  }

}

export namespace Player {

  export interface ICreate {
    guid: string
    name: string
  }
}
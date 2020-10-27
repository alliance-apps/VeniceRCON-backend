import { Entity, Column, OneToMany, In } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { ChatMessage } from "./ChatMessage"
import { Kill } from "./Kill"
import { Battlefield } from "vu-rcon"
import winston from "winston"

@Entity()
export class Player extends AbstractEntity<Player> {

  protected entityClass = Player

  @Column({ unique: true })
  guid!: string

  @Column()
  name!: string

  @OneToMany(type => ChatMessage, msg => msg.player)
  chats!: ChatMessage

  @OneToMany(type => Kill, kill => kill.killer)
  kills!: ChatMessage

  @OneToMany(type => Kill, kill => kill.killed)
  killed!: ChatMessage

  /** creates a new instance */
  static async from(props: Player.ICreate) {
    const player = new Player()
    player.guid = props.guid
    player.name = props.name
    return player.save()
  }

  /** gets a list of ids by the name */
  static async findIdsByName(names: string[]): Promise<Player[]> {
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
      .reduce((acc, id) => acc.includes(names[id]) ? acc : [...acc, names[id]], [] as (string|undefined)[]) as string[]
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
      players.push(await Player.from(data))
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
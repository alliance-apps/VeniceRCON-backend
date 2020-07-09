import { Entity, Column, OneToMany, In } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { ChatMessage } from "./ChatMessage"
import { Kill } from "./Kill"
import { Battlefield } from "vu-rcon"

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
  static async findIdsByName(names: string[]): Promise<Record<string, number|undefined>> {
    const entities = await Player
      .createQueryBuilder()
      .select("id, name")
      .where({ name: In(names) })
      .getRawMany()
    return Object.fromEntries(names.map(name => {
      const e = entities.find(e => e.name === name)
      return [name, e ? e.id : undefined]
    }))
  }

  /** retrieves multiple player ids by their name and indexes them by an identifier */
  static async getPlayerIds<
    T extends Record<string, number|undefined>
  >(
    names: Record<string, string|undefined>,
    retrieve: (name: string) => Promise<Battlefield.Player|undefined>
  ): Promise<T> {
    const result = Object.fromEntries(Object.keys(names).map(id => [id, undefined])) as T
    const filtered = Object.keys(names)
      .filter(id => typeof names[id] === "string")
      .reduce((acc, id) => acc.includes(names[id] as string) ? acc : [...acc, names[id] as string], [] as string[])
    const found = await Player.findIdsByName(filtered)
    const inserts = Object.keys(names)
      .filter(name => !found[name] && filtered.includes(name))
      .reduce((acc, name) => acc.includes(name) ? acc : [...acc, name], [] as string[])
    if (inserts.length > 0) {
      await Promise.all(inserts.map(async name => {
        const data = await retrieve(name)
        if (!data) return
        //@ts-ignore
        result[name] = (await Player.from(data)).id
      }))
    }
    Object.keys(found).forEach(name => {
      Object.keys(names)
        .filter(id => names[id] === name)
        //@ts-ignore
        .forEach(id => result[id] = found[name])
    })
    return result as T
  }

}

export namespace Player {

  export interface ICreate {
    guid: string
    name: string
  }
}
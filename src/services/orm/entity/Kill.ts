import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Player } from "./Player"
import { Instance } from "./Instance"

@Entity()
export class Kill extends AbstractEntity<Kill> {

  protected entityClass = Kill

  @ManyToOne(
    type => Player,
    player => player.chats,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  killer?: Promise<Player>

  @Column({ nullable: true })
  killerId?: number

  @ManyToOne(
    type => Player,
    player => player.chats,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  killed?: Player

  @Column({ nullable: true })
  killedId?: number

  @ManyToOne(
    type => Instance,
    instance => instance.kills,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  instance?: Instance

  @Column({ nullable: true })
  instanceId?: number

  @Column()
  headshot!: boolean

  @Column()
  weapon!: string

  async toJSON() {
    const [killer, killed] = await Promise.all([ this.killer, this.killed ])
    return {
      id: this.id,
      instance: this.instanceId,
      weapon: this.weapon,
      headshot: this.headshot,
      created: this.created,
      killer: killer ? {
        name: killer.name,
        guid: killer.guid
      } : undefined,
      killed: {
        name: killed!.name,
        guid: killed!.guid
      }
    }
  }

  setKiller(player: Player|number) {
    return this.setRelation("killer", player)
  }

  setKilled(player: Player|number) {
    return this.setRelation("killed", player)
  }

  setInstance(instance: Instance|number) {
    return this.setRelation("instance", instance)
  }

  /** creates a new instance */
  static async from(props: Kill.ICreate) {
    const kill = new Kill()
    kill.weapon = props.weapon
    kill.headshot = props.headshot
    await kill.save()
    await Promise.all([
      props.killer ? kill.setKiller(props.killer) : Promise.resolve(),
      kill.setKilled(props.killed),
      kill.setInstance(props.instance)
    ])
    await kill.reload()
    return kill
  }

}

export namespace Kill {

  export interface ICreate {
    killer?: Player|number
    killed: Player|number
    headshot: boolean
    weapon: string
    instance: Instance|number
  }
}
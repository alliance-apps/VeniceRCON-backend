import { Entity, Column, ManyToOne, MoreThan } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Player } from "./Player"
import { Instance } from "./Instance"
import { Weapon } from "./Weapon"

@Entity()
export class Kill extends AbstractEntity<Kill> {

  protected entityClass = Kill

  @ManyToOne(
    type => Player,
    player => player.kills,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  killer?: Player

  @Column({ nullable: true })
  killerId?: number

  @ManyToOne(
    type => Player,
    player => player.killed,
    { eager: true, cascade: true, onDelete: "CASCADE" }
  )
  killed!: Player

  @Column()
  killedId!: number

  @ManyToOne(
    type => Instance,
    instance => instance.kills,
    { cascade: true, onDelete: "CASCADE" }
  )
  instance!: Promise<Instance>

  @Column()
  instanceId!: number

  @Column()
  headshot!: boolean

  @ManyToOne(
    type => Weapon,
    { cascade: true, onDelete: "CASCADE" }
  )
  weapon!: Promise<Weapon>

  @Column({ nullable: true })
  weaponId!: number

  async toJSON() {
    const weapon = await this.weapon
    return {
      id: this.id,
      instance: this.instanceId,
      weapon: weapon ? weapon.name : null,
      headshot: this.headshot,
      created: this.created,
      killer: this.killer ? {
        name: this.killer.name,
        guid: this.killer.guid
      } : undefined,
      killed: {
        name: this.killed!.name,
        guid: this.killed!.guid
      }
    }
  }

  /** creates a new instance */
  static async from(props: Kill.ICreate) {
    const kill = new Kill()
    kill.headshot = props.headshot
    kill.instanceId = AbstractEntity.fetchId(props.instance)
    if (props.killer) kill.killerId = AbstractEntity.fetchId(props.killer)
    if (props.killed) kill.killedId = AbstractEntity.fetchId(props.killed)
    const weapon = typeof props.weapon === "string" ? await Weapon.getWeapon(props.weapon) : props.weapon
    kill.weaponId = AbstractEntity.fetchId(weapon)
    return kill.save()
  }

  static getFeed(
    instanceId: number,
    count: number = 10,
    from: number|Date = Date.now()
  ) {
    const date = from instanceof Date ? from : new Date(from)
    return this.createQueryBuilder()
      .select()
      .where({ created: MoreThan(date.getTime()), instanceId })
      .orderBy({ created: "DESC" })
      .limit(count)
      .getMany()
  }

}

export namespace Kill {

  export interface ICreate {
    killer?: Player|number
    killed: Player|number
    headshot: boolean
    weapon: string|Weapon|number
    instance: Instance|number
  }
}
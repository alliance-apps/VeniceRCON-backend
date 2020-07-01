import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Player } from "./Player"
import { Instance } from "./Instance"
import { Weapon } from "./Weapon"

@Entity()
export class Kill extends AbstractEntity<Kill> {

  protected entityClass = Kill

  @ManyToOne(
    type => Player,
    player => player.chats,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  killer?: Player

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
    { nullable: true, cascade: true, onDelete: "CASCADE" }
  )
  instance?: Promise<Instance>

  @Column({ nullable: true })
  instanceId?: number

  @Column()
  headshot!: boolean

  @ManyToOne(
    type => Weapon,
    { nullable: true, eager: true, cascade: true, onDelete: "CASCADE" }
  )
  weapon!: Weapon

  @Column({ nullable: true })
  weaponId!: number

  async toJSON() {
    return {
      id: this.id,
      instance: this.instanceId,
      weapon: this.weapon.name,
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

  setKiller(player: Player|number) {
    return this.setRelation("killer", player)
  }

  setKilled(player: Player|number) {
    return this.setRelation("killed", player)
  }

  setWeapon(weapon: Weapon|number) {
    return this.setRelation("weapon", weapon)
  }

  setInstance(instance: Instance|number) {
    return this.setRelation("instance", instance)
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
import { Entity, Column, Index } from "typeorm"
import { AbstractEntity } from "./Abstract"

@Entity()
export class Weapon extends AbstractEntity<Weapon> {

  protected entityClass = Weapon

  @Column()
  @Index()
  name!: string

  static async getWeapon(name: string) {
    let weapon = await Weapon.findOne({ where: { name } })
    if (!weapon) weapon = await Weapon.from({ name })
    return weapon
  }

  /** creates a new instance */
  static async from(props: Weapon.ICreate) {
    const weapon = new Weapon()
    weapon.name = props.name
    return weapon.save()
  }

}

export namespace Weapon {
  export interface ICreate {
    name: string
  }
}
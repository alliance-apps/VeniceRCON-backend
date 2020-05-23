import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Permission } from "./Permission"

@Entity()
export class Instance extends AbstractEntity<Instance> {

  protected entityClass = Instance

  @Column()
  host!: string

  @Column()
  port!: number

  @Column()
  password!: string

  @Column({ default: "" })
  name!: string

  @OneToMany(type => Permission, perm => perm.instance)
  permissions!: Promise<Permission[]>

  /** creates a new instance */
  static from(props: Instance.ICreate) {
    const instance = new Instance()
    instance.host = props.host
    instance.port = props.port
    instance.password = props.password
    return instance.save()
  }

}

export namespace Instance {
  export interface ICreate {
    host: string
    port: number
    password: string
    name?: string
  }
}
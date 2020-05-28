import { Entity, Column, OneToMany, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Permission } from "./Permission"
import { Invite } from "./Invite"
import { config } from "@service/config"

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

  @Column({ default: true })
  autostart!: boolean

  @Column({ default: config.instance.syncInterval })
  syncInterval!: number

  @OneToMany(type => Permission, perm => perm.instance)
  permissions!: Promise<Permission[]>

  @OneToMany(type => Invite, invite => invite.instance)
  invites!: Promise<Invite[]>

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
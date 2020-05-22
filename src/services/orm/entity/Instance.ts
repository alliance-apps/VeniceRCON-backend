import { Entity, Column } from "typeorm"
import { AbstractEntity } from "./Abstract"



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
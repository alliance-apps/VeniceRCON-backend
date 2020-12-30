import { Entity, Column } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { randomBytes } from "crypto"


@Entity()
export class Config extends AbstractEntity<Config> {

  protected entityClass = Config

  @Column({ unique: true, length: 100 })
  name!: string

  @Column()
  value!: string

  @Column({ default: false })
  public!: boolean

  /** creates a new instance */
  static async from(props: Config.ICreate) {
    const config = new Config()
    config.name = props.name
    config.value = props.value
    config.public = props.public
    return config.save()
  }
}


export namespace Config {

  export interface ICreate {
    name: string
    value: string
    public: boolean
  }

  export const DEFAULTS = [{
    name: "secret",
    value: randomBytes(30).toString("base64"),
    public: false
  }, {
    name: "dbversion",
    value: "2",
    public: false
  }]
}
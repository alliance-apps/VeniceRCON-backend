import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Instance } from "./Instance"

@Entity()
export class Plugin extends AbstractEntity<Plugin> {

  protected entityClass = Plugin

  @Column()
  name!: string

  @Column()
  version!: string

  @ManyToOne(type => Instance, instance => instance.plugins)
  instance!: Promise<Instance>

  @Column()
  instanceId?: number

  @Column({ default: "{}" })
  config!: string

  setInstance(instance: Instance|number) {
    return this.setRelation("instance", instance)
  }

  getConfig() {
    return JSON.parse(this.config)
  }

  setConfig(config: {}) {
    this.config = JSON.stringify(config)
    return this
  }

  /** creates a new plugin */
  static async from(props: Plugin.ICreate) {
    const plugin = new Plugin()
    plugin.name = props.name
    plugin.version = props.version
    plugin.config = props.config || "{}"
    await plugin.save()
    plugin.setInstance(props.instance)
    await plugin.reload()
    return plugin
  }

}

export namespace Plugin {
  export interface ICreate {
    name: string
    version: string
    config?: string
    instance: Instance|number
  }
}
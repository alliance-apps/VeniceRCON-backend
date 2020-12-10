import { PluginStore } from "./PluginStore"
import { Entity, Column, ManyToOne, Index } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Instance } from "./Instance"

@Entity()
export class Plugin extends AbstractEntity<Plugin> {

  protected entityClass = Plugin

  @Column()
  @Index()
  name!: string

  @ManyToOne(type => PluginStore, store => store.plugins)
  store!: Promise<PluginStore|null>

  @Column({ nullable: true })
  storeId!: number|null

  @ManyToOne(type => Instance, instance => instance.plugins)
  instance!: Promise<Instance>

  @Column()
  @Index()
  uuid!: string

  @Column({ default: false })
  start!: boolean

  @Column()
  instanceId!: number

  @Column({ default: "{}" })
  config!: string

  getConfig() {
    return JSON.parse(this.config)
  }

  setConfig(config: Record<string, any>) {
    this.config = JSON.stringify(config)
    return this
  }

  static async getPluginWithUpsert(props: Plugin.ICreate) {
    const entity = await Plugin.findOne({
      instanceId: AbstractEntity.fetchId(props.instance),
      storeId: props.store ? props.store.id : null,
      name: props.name
    })
    if (entity) return entity
    return Plugin.from(props)
  }

  static updateConfig(id: number, config: Record<string, any>) {
    return Plugin.createQueryBuilder()
      .update()
      .where({ id })
      .update({ config: JSON.stringify(config) })
  }

  /** creates a new plugin */
  static async from(props: Plugin.ICreate) {
    const plugin = new Plugin()
    plugin.name = props.name
    plugin.storeId = props.store ? props.store.id : null
    plugin.uuid = props.uuid
    plugin.config = props.config || "{}"
    plugin.instanceId = AbstractEntity.fetchId(props.instance)
    await plugin.save()
    await plugin.reload()
    return plugin
  }

}

export namespace Plugin {
  export interface ICreate {
    name: string
    store: PluginStore|null
    uuid: string
    config?: string
    instance: Instance|number
  }
}
import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Plugin } from "./Plugin"

@Entity()
export class PluginStore extends AbstractEntity<PluginStore> {

  protected entityClass = PluginStore

  @Column()
  url!: string

  @Column({ default: "" })
  branch!: string

  @Column({ default: "{}" })
  headers!: string

  @Column({ default: true })
  enabled!: boolean

  @OneToMany(type => Plugin, plugin => plugin.store)
  plugins!: Plugin

  @Column({ default: 15 * 60 * 1000 })
  reloadTime!: number

  /** creates a new plugin */
  static async from(props: PluginStore.ICreate) {
    const store = new PluginStore()
    store.url = props.url
    store.headers = props.headers
    store.enabled = !props.enabled
    store.branch = props.branch || ""
    return store.save()
  }

}

export namespace PluginStore {
  export interface ICreate {
    url: string
    branch?: string
    headers: string
    enabled?: boolean
  }
}
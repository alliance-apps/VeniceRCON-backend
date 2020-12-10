import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Plugin } from "./Plugin"

export enum PluginStoreType {
  GITHUB = "GITHUB_PROVIDER",
  DEV = "DEV_PROVIDER"
}

@Entity()
export class PluginStore extends AbstractEntity<PluginStore> {

  protected entityClass = PluginStore

  @Column({
    type: "simple-enum",
    default: PluginStoreType.GITHUB,
    enum: PluginStoreType
  })
  type!: PluginStoreType

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
    store.type = props.type || PluginStoreType.GITHUB
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
    type?: PluginStoreType
    branch?: string
    headers: string
    enabled?: boolean
  }
}
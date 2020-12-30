import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Plugin } from "./Plugin"

export enum PluginStoreType {
  INVALID = "INVALID",
  GITHUB = "GITHUB",
  DEV = "DEV"
}

@Entity()
export class PluginStore<T extends {}> extends AbstractEntity<PluginStore<any>> {

  protected entityClass = PluginStore

  @Column({
    type: "varchar",
    length: 32,
    default: PluginStoreType.GITHUB
  })
  type!: PluginStoreType

  @Column({ default: "{}", name: "options" })
  private _options!: string

  @Column({ default: true })
  enabled!: boolean

  @OneToMany(type => Plugin, plugin => plugin.store)
  plugins!: Plugin

  @Column({ default: 60 * 60 * 1000 })
  reloadTime!: number

  get options(): T {
    return JSON.parse(this._options)
  }

  set options(options: T) {
    this._options = JSON.stringify(options)
  }

  /** creates a new plugin */
  static async from<T>(props: PluginStore.ICreate<T>) {
    const store = new PluginStore<T>()
    store.type = props.type || PluginStoreType.GITHUB
    store.options = props.options
    store.enabled = props.enabled === false ? false : true
    return store.save()
  }

}

export namespace PluginStore {
  export interface ICreate<T extends {}> {
    type: PluginStoreType
    options: T
    enabled?: boolean
  }
}
import winston from "winston"
import { Repository } from "../Repository"
import { PluginStore as PluginStoreEntity } from "@entity/PluginStore"
import { Meta, metaSchema } from "../../schema"

export abstract class Provider<T = any, Y = any> {

  entity: PluginStoreEntity<T>
  /** list of plugins in this repository */
  plugins: Repository<T>[] = []

  /** retrieve a list of plugins from the source store */
  protected abstract fetchPlugins(): Promise<Provider.FetchPluginsResponse<T>>
  abstract destroy(): void
  abstract downloadPlugin(repository: Repository<Y>, location: string): Promise<void>

  constructor(props: Provider.Props<T>) {
    this.entity = props.entity
  }

  get id() {
    return this.entity.id
  }

  /** loads all plugins defined in the repository.yaml */
  async reload(reason?: string) {
    reason = reason ? ` (${reason})` : ""
    winston.info(`reading external plugins from store ${this.id}${reason}`)
    try {
      const plugins = await this.fetchPlugins()
      this.plugins = plugins.map(plugin => new Repository({ provider: this, ...plugin }))
      const i = this.plugins.length
      winston.info(`received ${i} plugin${i === 1 ? "" : "s"} from store ${this.id}`)
    } catch (e) {
      winston.error(`could not fetch plugins from repository ${this.id}`)
      winston.error(e)
    }
  }

  /** retrieves a specific plugin by its name from the repository */
  getPlugin(name: string) {
    return this.plugins.find(p => p.name === name)
  }

  /** validates a plugin meta object */
  static validatePluginMeta(data: any): Promise<Meta> {
    return metaSchema.validateAsync(data)
  }

  toJSON() {
    return {
      type: this.entity.type,
      id: this.entity.id,
      options: this.entity.options,
      created: this.entity.created,
      modified: this.entity.modified,
      plugins: this.plugins.map(p => p.toJSON())
    }
  }

}

export namespace Provider {
  export interface Props<T> {
    entity: PluginStoreEntity<T>
  }

  export type FetchPluginsResponse<T> = FetchPluginResponse<T>[]

  export type FetchPluginResponse<T> = {
    info: Repository.PluginInfoProps,
    props: T
  }
}
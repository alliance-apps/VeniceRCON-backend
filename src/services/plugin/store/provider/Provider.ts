import winston from "winston"
import { schema, PluginStoreSchema } from "../schema"
import { Repository } from "../Repository"
import { PluginStore as PluginStoreEntity } from "@entity/PluginStore"

export abstract class Provider {

  entity: PluginStoreEntity
  /** list of plugins in this repository */
  plugins: Repository[] = []

  /** retrieve a list of plugins from the source store */
  protected abstract fetchPlugins(): Promise<PluginStoreSchema>
  abstract destroy(): void
  abstract downloadPlugin(repository: Repository, location: string): Promise<void>

  constructor(props: Provider.Props) {
    this.entity = props.entity
  }

  get id() {
    return this.entity.id
  }

  /** url to fetch the repository yaml file from */
  get url() {
    return Provider.url(this.entity.url, this.entity.branch)
  }

  /** loads all plugins defined in the repository.yaml */
  async reload(reason?: string) {
    reason = reason ? ` (${reason})` : ""
    winston.info(`reading external plugins from store ${this.id}${reason}`)
    try {
      const store = await this.validateSchema(await this.fetchPlugins())
      this.plugins = store.plugins.map(schema => new Repository({ provider: this, schema }))
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

  /** parses and validates a plugins repository schema */
  private validateSchema(data: PluginStoreSchema): Promise<PluginStoreSchema> {
    return schema.validateAsync(data, { allowUnknown: true })
  }

  static url(baseUrl: string, branch: string) {
    return `${baseUrl}/raw/${branch}/repository.yaml`
  }

  toJSON() {
    return {
      ...this.entity,
      repositoryUrl: this.url,
      plugins: this.plugins.map(p => p.toJSON())
    }
  }

}

export namespace Provider {
  export interface Props {
    entity: PluginStoreEntity
  }
}
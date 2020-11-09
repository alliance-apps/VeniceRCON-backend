import fetch from "node-fetch"
import yaml from "yaml"
import winston from "winston"
import { schema, PluginStoreSchema } from "./schema"
import { Repository } from "./Repository"
import { PluginStore as PluginStoreEntity } from "@entity/PluginStore"

export class Provider {

  entity: PluginStoreEntity
  private interval: any
  /** list of plugins in this repository */
  plugins: Repository[] = []

  constructor(props: Provider.Props) {
    this.entity = props.entity
  }

  destroy() {
    clearInterval(this.interval)
  }

  get id() {
    return this.entity.id
  }

  /** url to fetch the repository yaml file from */
  get url() {
    return `${this.entity.url}/raw/${this.entity.branch}/repository.yaml`
  }

  /** loads all plugins defined in the repository.yaml */
  async reload() {
    clearInterval(this.interval)
    winston.info(`reading external plugins from store ${this.id}...`)
    try {
      const store = await this.parseSchema(await this.fetch())
      this.plugins = store.plugins.map(schema => new Repository({ provider: this, schema }))
      const i = this.plugins.length
      this.interval = setInterval(() => this.reload(), this.entity.reloadTime)
      winston.info(`received ${i} plugin${i === 1 ? "" : "s"} from store ${this.id}`)
    } catch (e) {
      winston.error(`could not fetch plugins from ${this.url}`)
      winston.error(e)
    }
  }

  /** retrieves a specific plugin by its name from the repository */
  getPlugin(name: string) {
    return this.plugins.find(p => p.name === name)
  }

  /** parses and validates a plugins repository schema */
  private parseSchema(data: string): Promise<PluginStoreSchema> {
    return schema.validateAsync(
      yaml.parse(data),
      { allowUnknown: true }
    )
  }

  /** fetches the repository.yaml via http request */
  private async fetch() {
    const response = await fetch(this.url, {
      headers: JSON.parse(this.entity.headers),
      redirect: "follow"
    })
    return response.text()
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
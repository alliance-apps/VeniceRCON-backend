import fetch from "node-fetch"
import yaml from "yaml"
import winston from "winston"
import { schema, PluginStoreSchema } from "./schema"
import { Repository } from "./Repository"
import { config } from "@service/config"

export class Provider {

  /** name of the store provider */
  name: string
  /** branch which gets used to fetch the repository from */
  branch: string
  /** github repository url */
  repository: string
  /** optional headers which should gets set in the http request */
  headers: Record<string, string>
  /** list of plugins in this repository */
  plugins: Repository[] = []

  constructor(props: Provider.Props) {
    this.name = props.name
    this.branch = props.branch
    this.repository = props.repository
    this.headers = props.headers || {}
    this.reload()
    setInterval(() => this.reload(), config.instance.plugins.reloadInterval * 60 * 1000)
  }

  /** url to fetch the repository yaml file from */
  get url() {
    return `${this.repository}/raw/${this.branch}/repository.yaml`
  }

  /** loads all plugins defined in the repository.yaml */
  async reload() {
    winston.info(`reading external plugins from store "${this.name}"...`)
    try {
      const store = await this.parseSchema(await this.fetch())
      this.plugins = store.plugins.map(repo => new Repository({
        provider: this,
        schema: repo
      }))
      const count = this.plugins.length
      winston.info(`received ${count} plugin${count === 1 ? "" : "s"} from store "${this.name}"`)
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
  private parseSchema(data: string) {
    return schema.validate<PluginStoreSchema>(
      yaml.parse(data),
      { allowUnknown: true }
    )
  }

  /** fetches the repository.yaml via http request */
  private async fetch() {
    const response = await fetch(this.url, {
      headers: this.headers,
      redirect: "follow"
    })
    return response.text()
  }

}

export namespace Provider {
  export interface Props {
    name: string
    repository: string
    branch: string
    headers?: Record<string, string>
  }
}
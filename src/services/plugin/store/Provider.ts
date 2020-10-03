import fetch from "node-fetch"
import yaml from "yaml"
import winston from "winston"
import { schema, PluginStoreSchema } from "./schema"
import { Repository } from "./Repository"

export class Provider {

  name: string
  branch: string
  repository: string
  headers: Record<string, string>
  plugins: Repository[] = []

  constructor(props: Provider.Props) {
    this.name = props.name
    this.branch = props.branch
    this.repository = props.repository
    this.headers = props.headers || {}
    this.reload()
  }

  get url() {
    return `${this.repository}/raw/${this.branch}/repository.yaml`
  }

  async reload() {
    winston.info(`reading external plugins from store "${this.name}"...`)
    try {
      const store = await this.parseSchema(await this.fetch())
      this.plugins = store.plugins.map(repo => new Repository(repo))
      winston.info(`received ${this.plugins.length} plugins from store "${this.name}"`)
    } catch (e) {
      winston.error(`could not fetch plugins from ${this.url}`)
      winston.error(e)
    }
  }

  getPlugin(name: string) {
    return this.plugins.find(p => p.name === name)
  }

  private parseSchema(data: string) {
    return schema.validate<PluginStoreSchema>(
      yaml.parse(data),
      { allowUnknown: true }
    )
  }

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
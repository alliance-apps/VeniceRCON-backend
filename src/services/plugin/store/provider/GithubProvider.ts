import { Provider } from "./Provider"
import fetch from "node-fetch"
import yaml from "yaml"
import { Repository } from "../Repository"
import unzipper from "unzipper"
import { PluginStore, PluginStoreType } from "@entity/PluginStore"
import { Joi } from "koa-joi-router"
import winston from "winston"

export class GithubProvider extends Provider<GithubProvider.Schema, GithubProvider.RepositoryPluginSchema> {

  static BaseURL = "https://raw.githubusercontent.com"
  static ProviderSchema = Joi.object({
    plugins: Joi.array().items(Joi.object({
      username: Joi.string().required(),
      repository: Joi.string().required(),
      commit: Joi.string().regex(/^[a-f0-9]{40}$/).required()
    }))
  })

  private interval: any

  constructor(props: Provider.Props<GithubProvider.Schema>) {
    super(props)
    this.interval = setInterval(() => this.reload("timer"), this.reloadTime)
  }

  get reloadTime() {
    return this.entity.reloadTime > 60 * 1000 ? this.entity.reloadTime : 60 * 60 * 1000
  }

  /** url to fetch the repository yaml file from */
  get url() {
    return GithubProvider.getProviderUrl(this.entity.options)
  }

  static getProviderUrl(schema: GithubProvider.Schema) {
    const { username, repository, branch } = schema
    return `${GithubProvider.BaseURL}/${username}/${repository}/${branch}/repository.yaml`
  }

  static getRepositoryUrl(plugin: GithubProvider.RepositoryPluginSchema) {
    const { username, repository, commit } = plugin
    return `${GithubProvider.BaseURL}/${username}/${repository}/${commit}/meta.yaml`
  }

  static getArchiveUrl(repository: Repository<GithubProvider.RepositoryPluginSchema>) {
    const props = repository.providerProps
    return `https://codeload.github.com/${props.username}/${props.repository}/zip/${props.commit}`
  }

  /** retrieves a list of plugins */
  protected async fetchPlugins<T = Provider.FetchPluginsResponse<GithubProvider.RepositoryPluginSchema>>(): Promise<T> {
    const response = await fetch(this.url, { redirect: "follow" })
    if (response.status !== 200) throw new Error(`received status code ${response.status} but expected 200 (${this.url})`)
    const validated = await GithubProvider.validateRepository(yaml.parse(await response.text()))
    const plugins = await Promise.all(validated.plugins.map(p => this.getPluginInfo(p)))
    return plugins.filter(p => p !== null) as unknown as T
  }

  private async getPluginInfo(plugin: GithubProvider.RepositoryPluginSchema): Promise<null|Provider.FetchPluginResponse<GithubProvider.RepositoryPluginSchema>> {
    try {
      const response = await fetch(GithubProvider.getRepositoryUrl(plugin), { redirect: "follow" })
      if (response.status !== 200) throw new Error(`received status code ${response.status} but expected 200 (${GithubProvider.getRepositoryUrl(plugin)})`)
      const meta = await Provider.validatePluginMeta(yaml.parse(await response.text()))
      const { name, description, version, author } = meta
      return {
        info: { name, description, version, author },
        props: plugin
      }
    } catch (e) {
      winston.error(`could not get plugin ${plugin.username}/${plugin.repository} from store ${this.id}`)
      winston.error(e.stack||e.message)
      return null
    }
  }

  destroy() {
    clearInterval(this.interval)
  }

  async downloadPlugin(repository: Repository<GithubProvider.RepositoryPluginSchema>, location: string) {
    const res = await  fetch(GithubProvider.getArchiveUrl(repository))
    const data = await unzipper.Open.buffer(await res.buffer())
    //manipulate directory path
    data.files.forEach(f => f.path = f.path.split("/").slice(1).join("/"))
    await data.extract({ path: location })
  }

  static validateRepository(data: any): Promise<GithubProvider.RepositorySchema> {
    const schema = GithubProvider.ProviderSchema
    return schema.validateAsync(data)
  }

  static async createProvider<T = GithubProvider.Schema>(options: T) {
    return PluginStore.from({
      type: PluginStoreType.GITHUB,
      options,
      enabled: true
    })
  }

  /** checks a repository for validity */
  static async verify(props: GithubProvider.Schema) {
    const res = await fetch(GithubProvider.getProviderUrl(props))
    if (res.status < 200 || res.status > 299) throw new Error(`invalid status code: ${res.status}`)
    return GithubProvider.validateRepository(yaml.parse(await res.text()))
  }

}

export namespace GithubProvider {
  export type Schema = {
    username: string
    repository: string
    branch: string
  }

  export type RepositoryPluginSchema = {
    username: string
    repository: string
    commit: string
  }

  export type RepositorySchema = {
    plugins: RepositoryPluginSchema[]
  }
}
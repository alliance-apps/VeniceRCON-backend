import { GithubProvider } from "./provider/GithubProvider"
import { config } from "@service/config"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"
import { PluginStore as PluginStoreEntity, PluginStoreType } from "@entity/PluginStore"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { instanceManager } from "@service/battlefield"
import fetch from "node-fetch"
import { Repository } from "./Repository"
import { Provider } from "./provider/Provider"
import { DevProvider } from "./provider/DevProvider"
import { Brackets } from "typeorm"
import { createFolderSave } from "../../../util/createFolder"

export class PluginStore {

  providers: Provider[] = []

  async init() {
    await createFolderSave(path.join(
      config.basepath, config.instance.plugins.baseDir
    ))
  }

  /**
   * retrieves the plugin installation path for the specified instance
   * @param instance instance to retrieve the installation path from
   */
  getBaseDir(instance: Instance) {
    return path.join(
      config.basepath,
      config.instance.plugins.baseDir,
      instance.id.toString(10)
    )
  }

  /** loads all providers from database */
  private async loadProviders() {
    const entities = [...(await PluginStoreEntity.find()), this.loadDevEntity()]
    const ids = entities.map(e => e.id)
    await Promise.all(entities.map(async entity => this.updateProvider(entity)))
    //filters every provider which might have been removed from database
    this.providers = this.providers.filter(provider => {
      if (ids.includes(provider.id)) return true
      //provider has been removed from database
      provider.destroy()
      return false
    })
    if (instanceManager) await instanceManager.reloadPlugins()
  }

  /** create a dummy provider for dev plugins */
  private loadDevEntity() {
    //create a dummy object
    const entity = {} as PluginStoreEntity
    entity.save = () => { throw new Error("save not implemented for 'dev' provider") }
    entity.remove = () => { throw new Error("remove not implemented for 'dev' provider") }
    entity.update = () => { throw new Error("update not implemented for 'dev' provider") }
    entity.type = PluginStoreType.DEV
    entity.enabled = true
    entity.id = 0
    entity.url = ""
    //every 10 minutes
    entity.reloadTime = 10 * 60 * 1000
    return entity
  }

  /** adds or updates a provider with the given entity */
  async updateProvider(entity: PluginStoreEntity) {
    let provider = this.providers.find(provider => provider.id === entity.id)
    if (provider) {
      provider.entity = entity
      await provider.reload()
    } else {
      provider = this.createProviderFromType(entity)
      await provider.reload()
      this.providers.push(provider)
    }
  }

  /** creates a provider instance from the entity type */
  private createProviderFromType(entity: PluginStoreEntity): Provider {
    switch (entity.type) {
      case PluginStoreType.GITHUB:
        return new GithubProvider({ entity })
      case PluginStoreType.DEV:
        return new DevProvider({ entity })
      default:
        throw new Error(`unknown provider type "${entity.type}"`)
    }
  }

  /** reloads the content of all repositories */
  async reload() {
    await this.loadProviders()
  }

  /** retrieves a map of all plugins available */
  getPlugins() {
    return this.providers
      .map(({ plugins }) => plugins.map(p => p.toJSON()))
      .flat()
  }

  /** retrieves a specific store by its nmae */
  getProvider(id: number) {
    return this.providers.find(p => p.id === id)
  }

  /** retrieves a plugin instance by its uuid */
  getPluginByUUID(uuid: string) {
    let plugin: Repository|undefined
    this.providers.some(provider => {
      const repo = provider.plugins.find(plugin => plugin.uuid === uuid)
      if (!repo) return false
      plugin = repo
      return true
    })
    return plugin
  }

  /** retrieves all plugins from a specific instance */
  getPluginsByInstance(instance: Instance) {
    return PluginEntity.createQueryBuilder("plugin")
      .leftJoin("plugin.store", "store")
      .where("plugin.instance.id = :id", { id: instance.id })
      .andWhere(new Brackets(qb => qb
        .where("store.enabled = true")
        .orWhere("plugin.storeId IS NULL")
      ))
      .getMany()
  }

  /** checks a repository for validity */
  static async verifyProvider(props: PluginStore.TestProps) {
    if (!(/^https:\/\/github.com/i).test(props.url))
      throw new Error("only github as url supported!")
    const url = Provider.url(props.url, props.branch || "main")
    const res = await fetch(url, {
      headers: JSON.parse(props.headers || "{}"),
      redirect: "follow"
    })
    if (res.status < 200 || res.status > 299)
      throw new Error(`invalid status code from ${url} (code: ${res.status})`)
    return res.text()
  }

}

export namespace PluginStore {
  export interface TestProps {
    url: string
    branch?: string
    headers?: string
  }
}
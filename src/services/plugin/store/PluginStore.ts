import { Provider } from "./Provider"
import { config } from "@service/config"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"
import { PluginStore as PluginStoreEntity } from "@entity/PluginStore"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { instanceManager } from "@service/battlefield"

export class PluginStore {

  providers: Provider[] = []

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
    const entities = await PluginStoreEntity.find()
    const ids = entities.map(e => e.id)
    await Promise.all(entities.map(async entity => this.updateProvider(entity)))
    this.providers = this.providers.filter(provider => {
      if (ids.includes(provider.id)) return true
      provider.destroy()
      return false
    })
    if (instanceManager) await instanceManager.reloadPlugins()
  }

  /** adds or updates a provider with the given entity */
  async updateProvider(entity: PluginStoreEntity) {
    let provider = this.providers.find(provider => provider.id === entity.id)
    if (provider) {
      provider.entity = entity
    } else {
      provider = new Provider({ entity })
    }
    await provider.reload()
    this.providers.push(provider)
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

  /** retrieves all plugins from a specific instance */
  getPluginsByInstance(instance: Instance) {
    return PluginEntity.createQueryBuilder("plugin")
      .innerJoin("plugin.store", "store")
      .where("plugin.instance.id = :id", { id: instance.id })
      .andWhere("store.enabled = true")
      .getMany()
  }
}

export namespace PluginStore {
  export interface TestProps {
    url: string
    branch?: string
    header?: string
  }
}
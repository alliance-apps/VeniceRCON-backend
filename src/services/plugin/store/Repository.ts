import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import { Provider } from "./provider/Provider"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { createFolderSave } from "../../../util/createFolder"
import { createHash } from "crypto"
import { PluginStoreType } from "../../orm/entity/PluginStore"

export class Repository<T> {

  static internals = {
    folder: ".meta",
    store: "store.json"
  }

  info: Repository.PluginPublicInfo
  providerProps: T
  provider: Provider<{}>

  constructor(props: Repository.Props<T>) {
    this.provider = props.provider
    this.providerProps = props.props
    const uuid = `${this.provider.id}.${props.info.name}`
    this.info = {
      ...props.info,
      type: this.provider.entity.type,
      uuid: createHash("md5").update(uuid).digest("hex")
    }
  }

  get name() {
    return this.info.name
  }

  get version() {
    return this.info.version
  }

  get uuid() {
    return this.info.uuid
  }

  /** retrieves folder path for this plugin for the specified instance */
  private getDownloadPath(instance: Instance) {
    return path.join(pluginStore.getBaseDir(instance), this.uuid)
  }

  /** creates basic internal stuff for this repo */
  private async initPluginFolder(folder: string, uuid: string) {
    const pluginLocation = path.join(folder, uuid)
    const metaLocation = path.join(pluginLocation, Repository.internals.folder)
    try {
      await fs.stat(metaLocation)
      return false
    } catch (e) {
      if (e.code !== "ENOENT") throw e
      await createFolderSave(folder)
      await createFolderSave(pluginLocation)
      await createFolderSave(metaLocation)
      return true
    }
  }

  /**
   * downloads the plugin to the specified instance
   * @param instance instance to install the plugin to
   */
  async downloadTo(instance: Instance) {
    const location = this.getDownloadPath(instance)
    const created = await this.initPluginFolder(pluginStore.getBaseDir(instance), this.uuid)
    const storeEntity = this.provider.entity
    const entity = await PluginEntity.getPluginWithUpsert({
      instance: instance.id,
      name: this.name,
      store: storeEntity.id > 0 ? storeEntity : null,
      uuid: this.uuid
    })
    try {
      await this.provider.downloadPlugin(this, location)
    } catch (e) {
      if (created) await Promise.all([
        fs.rm(location, { recursive: true, force: true }),
        entity.remove()
      ])
      instance.log.error(`could not download plugin uuid "${this.uuid}", ${e.message}`)
      throw e
    }
    await instance.plugin.reloadPlugins(true)
  }

  /** json schema for the api */
  toJSON(): Repository.PluginPublicInfo {
    return this.info
  }

}

export namespace Repository {
  export interface Props<T> {
    info: PluginInfoProps
    props: T
    provider: Provider<T>
  }

  export type PluginInfoProps = {
    name: string
    description: string
    version: string
    author: string
  }

  export type PluginPublicInfo = PluginInfoProps & {
    type: PluginStoreType
    uuid: string
  }
}
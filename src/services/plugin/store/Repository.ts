import { PluginSchema } from "./schema"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import { Provider } from "./provider/Provider"
import { createHash } from "crypto"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { createFolderSave } from "../../../util/createFolder"

export class Repository {

  static internals = {
    folder: ".meta",
    store: "store.json"
  }

  name: string
  description: string
  version: string
  repository: string
  commit: string
  provider: Provider
  uuid: string

  constructor(props: Repository.Props) {
    this.provider = props.provider
    this.name = props.schema.name
    this.description = props.schema.description
    this.version = props.schema.version
    this.repository = props.schema.repository
    this.commit = props.schema.commit
    this.uuid = createHash("md5").update(`${this.provider.id.toString()}.${this.name}`).digest("hex")
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

  /**
   * json schema for the api
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
      uuid: this.uuid
    }
  }

}

export namespace Repository {
  export interface Props {
    schema: PluginSchema,
    provider: Provider
  }
}
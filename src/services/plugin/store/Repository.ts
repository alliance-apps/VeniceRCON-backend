import { PluginSchema } from "./schema"
import fetch from "node-fetch"
import unzipper from "unzipper"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import { Provider } from "./Provider"
import { Plugin as PluginEntity } from "@entity/Plugin"

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

  constructor(props: Repository.Props) {
    this.provider = props.provider
    this.name = props.schema.name
    this.description = props.schema.description
    this.version = props.schema.version
    this.repository = props.schema.repository
    this.commit = props.schema.commit
  }

  /** url to the repository archive file */
  get url() {
    return `${this.repository}/archive/${this.commit}.zip`
  }

  /** fetches the repositories archive file via http request */
  private fetchArchive() {
    return fetch(this.url)
  }

  /** retrieves folder path for this plugin for the specified instance */
  private getDownloadPath(instance: Instance, uuid: string) {
    return path.join(pluginStore.getBaseDir(instance), uuid)
  }

  /**
   * downloads the plugin to the specified instance
   * @param instance instance to install the plugin to
   */
  async downloadTo(instance: Instance) {
    const entity = await PluginEntity.getPluginWithUpsert({
      instance: instance.id,
      name: this.name,
      store: this.provider.name
    })
    const location = this.getDownloadPath(instance, entity.uuid)
    const res = await this.fetchArchive()
    const data = await unzipper.Open.buffer(await res.buffer())
    //manipulate directory path
    data.files.forEach(f => f.path = f.path.split("/").slice(1).join("/"))
    await data.extract({ path: location })
    await this.initPluginFolder(location)
    await instance.plugin.reloadPlugins()
  }

  /** creates basic internal stuff for this repo */
  private async initPluginFolder(folder: string) {
    const location = path.join(folder, Repository.internals.folder)
    try {
      await fs.stat(location)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
      await fs.mkdir(location)
    }
  }

  /**
   * json schema for the api
   */
  json() {
    return {
      name: this.name,
      store: this.provider.name,
      description: this.description,
      version: this.version
    }
  }

}

export namespace Repository {
  export interface Props {
    schema: PluginSchema,
    provider: Provider
  }
}
import { PluginSchema } from "./schema"
import fetch from "node-fetch"
import unzipper from "unzipper"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from ".."

export class Repository {

  name: string
  description: string
  version: string
  repository: string
  commit: string

  constructor(props: PluginSchema) {
    this.name = props.name
    this.description = props.description
    this.version = props.version
    this.repository = props.repository
    this.commit = props.commit
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
  private getDownloadPath(instance: Instance) {
    return path.join(pluginStore.getBaseDir(instance), this.name)
  }

  /**
   * downloads the plugin to the specified instance
   * @param instance instance to install the plugin to
   */
  async downloadTo(instance: Instance) {
    const res = await this.fetchArchive()
    const data = await unzipper.Open.buffer(await res.buffer())
    //manipulate directory path
    data.files.forEach(f => f.path = f.path.split("/").slice(1).join("/"))
    await data.extract({ path: this.getDownloadPath(instance) })
    await instance.plugin.reloadPlugins()
  }

  /**
   * json schema for the api
   */
  json() {
    return {
      name: this.name,
      description: this.description,
      version: this.version
    }
  }

}

export namespace Repository {
}
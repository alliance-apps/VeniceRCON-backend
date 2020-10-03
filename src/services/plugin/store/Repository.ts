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

  get url() {
    return `${this.repository}/archive/${this.commit}.zip`
  }

  private fetchArchive() {
    return fetch(this.url)
  }

  private getDownloadPath(instance: Instance) {
    return path.join(pluginStore.getBaseDir(instance), this.name)
  }

  async downloadTo(instance: Instance) {
    const res = await this.fetchArchive()
    const data = await unzipper.Open.buffer(await res.buffer())
    //manipulate directory path
    data.files.forEach(f => f.path = f.path.split("/").slice(1).join("/"))
    await data.extract({ path: this.getDownloadPath(instance) })
    await instance.plugin.reloadPlugins()
  }

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
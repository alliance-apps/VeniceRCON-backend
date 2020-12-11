import { Provider } from "./Provider"
import { PluginSchema, PluginStoreSchema } from "../schema"
import { promises as fs } from "fs"
import { config } from "@service/config"
import path from "path"
import yaml from "yaml"
import winston from "winston"
import { Repository } from "../Repository"
import copy from "recursive-copy"

export class DevProvider extends Provider {

  /** retrieves a list of plugins from the dev folder */
  protected async fetchPlugins(): Promise<PluginStoreSchema> {
    const folders = await this.fetchFolders()
    return {
      plugins: (await Promise.all(folders.map(async folder => {
        const meta = await this.getPluginMeta(folder)
        if (meta === null) return null
        return {
          name: meta.name,
          description: meta.description,
          version: meta.version,
          repository: DevProvider.folderLocation(folder),
          commit: "__DEV__"
        } as PluginSchema
      }))).filter(p => p !== null) as PluginSchema[]
    }
  }

  /** loads and parses plugin meta data schema */
  private async getPluginMeta(plugin: string) {
    try {
      return yaml.parse(
        await fs.readFile(DevProvider.folderLocation(plugin, "meta.yaml"), "utf-8")
      )
    } catch (e) {
      winston.error(`could not parse meta.yaml from dev plugin folder ${plugin}: ${e.message}`)
      return null
    }
  }

  /** gets a list of folders inside the plugins dev folder */
  private async fetchFolders() {
    try {
      const files = await fs.readdir(DevProvider.folderLocation())
      return files
    } catch (e) {
      if (e.code === "ENOENT") return []
      throw e
    }
  }

  /** gets the path to where the dev plugins are located */
  static folderLocation(...additional: string[]) {
    return path.join(
      config.basepath,
      config.instance.plugins.baseDir,
      "dev",
      ...additional
    )
  }

  async downloadPlugin(repository: Repository, location: string) {
    await copy(repository.repository, location, { overwrite: true })
  }

}

export namespace DevProvider {

}
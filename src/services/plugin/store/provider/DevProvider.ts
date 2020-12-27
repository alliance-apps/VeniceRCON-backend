import { Provider } from "./Provider"
import { PluginSchema, PluginStoreSchema } from "../schema"
import { promises as fs } from "fs"
import { config } from "@service/config"
import path from "path"
import yaml from "yaml"
import winston from "winston"
import { Repository } from "../Repository"
import copy from "recursive-copy"
import chokidar from "chokidar"

export class DevProvider extends Provider {

  static WAIT_TIME = 500
  private watcher: chokidar.FSWatcher
  private timeout: any

  constructor(props: Provider.Props) {
    super(props)
    const location = DevProvider.folderLocation()
    this.watcher = chokidar.watch([
      `${location}/**/*`, //watch everything inside the dev folder
      `!${location}/*/node_modules`, //ignore all node_moodules
      `!${location}/*/package(-lock)?.json`, //ignores all package jsons
      `!${location}/**/.*` //ignore all files which starts with "."
    ], {
      awaitWriteFinish: true
    })
    this.watcher
      .on("add", file => winston.verbose(`adding file watcher to ${file}`))
      .on("addDir", dir => winston.verbose(`adding directoy watcher to ${dir}`))
      .on("unlink", file => winston.verbose(`removing file watcher from ${file}`))
      .on("unlinkDir", dir => winston.verbose(`removing dir watcher from ${dir}`))
      .on("change", file => {
        clearTimeout(this.timeout)
        this.timeout = setTimeout(() => this.reload(`changes in "${file}"`), DevProvider.WAIT_TIME)
      })
  }

  destroy() {
    this.watcher.close()
    clearTimeout(this.timeout)
  }

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
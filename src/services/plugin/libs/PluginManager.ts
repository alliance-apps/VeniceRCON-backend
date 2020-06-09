import { promises as fs } from "fs"
import winston from "winston"
import path from "path"
import { parse } from "yaml"
import { PluginBlueprint } from "./PluginBlueprint"

export class PluginManager {

  private readonly pluginFolder: string
  private plugins: Record<string, PluginBlueprint> = {}

  constructor(props: PluginManager.Props) {
    this.pluginFolder = props.path
  }

  async init() {
    try {
      const stat = await fs.stat(this.pluginFolder)
      if (!stat.isDirectory)
        return winston.error(`plugin folder is not a directory ${this.pluginFolder}`)
    } catch (e) {
      winston.info(`plugin folder not found ${this.pluginFolder}`)
      return
    }
    await this.reloadPlugins()
  }

  /** retrieves all available plugins */
  getPlugins() {
    return Object.values(this.plugins)
  }

  private async reloadPlugins() {
    const plugins = await fs.readdir(this.pluginFolder)
    for (const name of plugins) {
      const folder = path.join(this.pluginFolder, name)
      winston.verbose(`loading plugin meta.yaml from folder ${folder}`)
      const meta = parse(await fs.readFile(path.join(folder, "meta.yaml"), "utf8"))
      try {
        await PluginBlueprint.validateMeta(meta)
      } catch (e) {
        winston.error(`invalid schema.yaml in ${path.join(folder, "meta.yaml")}, skipping...`)
        winston.error(e)
        continue
      }
      const current = this.plugins[name]
      if (current) await current.stop()
      delete this.plugins[name]
      this.plugins[name] = new PluginBlueprint({ id: name, basePath: folder, meta })
    }
  }
}

export namespace PluginManager {
  export interface Props {
    path: string
  }
}
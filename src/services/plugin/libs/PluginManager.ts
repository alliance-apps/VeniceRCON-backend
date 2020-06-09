import { promises as fs } from "fs"
import winston from "winston"
import path from "path"
import { parse } from "yaml"
import { PluginBlueprint } from "./PluginBlueprint"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { Plugin } from "./Plugin"
import { Instance } from "@service/battlefield/Instance"

export class PluginManager {

  private readonly pluginFolder: string
  private blueprints: Record<string, PluginBlueprint> = {}

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

  /** retrieves all available plugins for a specific backend */
  getPlugins(backend: "BF3"|"VU"|"ALL" = "ALL") {
    return Object.values(this.blueprints).filter(({ meta }) => {
      switch (backend) {
        default:
        case "BF3": return meta.backend === "BF3"
        case "ALL":
        case "VU": return true
      }
    })
  }

  getBlueprint(name: string, backend?: "BF3"|"VU"|"ALL") {
    return this.getPlugins(backend).find(bp => bp.id === name)
  }

  async getPluginsFromInstance(instance: Instance): Promise<Plugin[]> {
    const plugins = await PluginEntity.find({ instanceId: instance.id })
    return (await Promise.all(plugins.map(async entity => {
      const blueprint = this.getBlueprint(entity.name, "ALL")
      if (!blueprint) return undefined
      return new Plugin({ entity, blueprint })
    }))).filter(p => p !== undefined) as Plugin[]
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
      const current = this.blueprints[name]
      if (current) await current.stop()
      delete this.blueprints[name]
      this.blueprints[name] = new PluginBlueprint({ id: name, basePath: folder, meta })
    }
  }
}

export namespace PluginManager {
  export interface Props {
    path: string
  }
}
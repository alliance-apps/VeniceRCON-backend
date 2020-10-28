import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import path from "path"
import yaml from "yaml"
import { Plugin } from "./Plugin"
import { PluginWorker } from "./PluginWorker"
import { Plugin as PluginEntity } from "@entity/Plugin"

export class PluginManager {

  readonly parent: Instance
  readonly baseDir: string
  private shouldRun: boolean = false
  private plugins: Plugin[] = []
  readonly worker: PluginWorker

  constructor(props: PluginManager.Props) {
    this.parent = props.parent
    this.baseDir = pluginStore.getBaseDir(this.parent)
    this.worker = new PluginWorker({
      baseDir: this.baseDir, parent: this
    })
    this.reloadPlugins()
  }

  async toJSON() {
    return await Promise.all(this.plugins.map(plugin => plugin.toJSON()))
  }

  /** stops the worker */
  stop() {
    this.shouldRun = false
    return this.worker.stop()
  }

  /** starts the worker */
  async start() {
    this.shouldRun = true
    if (this.plugins.length === 0) return
    await this.worker.spawn()
  }

  /** reloads all plugins for this instance from disk */
  async reloadPlugins() {
    //stop the worker and empty the current plugin list
    await this.worker.stop()
    this.plugins = []
    //check if folder exists with a single plugin in it
    try {
      await fs.stat(this.baseDir)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
      return
    }
    const folders = await fs.readdir(this.baseDir)
    await Promise.allSettled(
      folders.map(async uuid => {
        const base = path.join(this.baseDir, uuid)
        try {
          const meta = yaml.parse(await fs.readFile(path.join(base, "meta.yaml"), "utf-8"))
          const entity = await PluginEntity.findOneOrFail({ uuid })
          const plugin = new Plugin({ meta, parent: this, entity })
          try {
            await plugin.validate()
          } catch (e) {
            this.parent.log.warn(`invalid schema provided in plugin ${name}`)
            this.parent.log.warn(e)
            return
          }
          if (!plugin.isCompatible())
            return this.parent.log.info(`ignoring plugin ${name} because backend is incompatible`)
          this.plugins.push(plugin)
        } catch (e) {
          this.parent.log.error(`could not load plugin from ${base}`)
          this.parent.log.error(e)
        }
      })
    )
    //start the worker again
    if (this.shouldRun) await this.worker.spawn()
  }

  /** retrieves a plugin by its name */
  getPluginByName(name: string) {
    return this.plugins.find(p => p.name === name)
  }

  async getPluginById(id: number) {
    const plugin = this.plugins.find(plugin => plugin.id === id)
    if (!plugin) throw new Error(`could not find plugin with id ${id}`)
    return plugin
  }

  /** retrieves all plugins which should autostart */
  async getEnabledPlugins() {
    const plugins: Plugin[] = []
    await Promise.all(
      this.plugins.map(async p => {
        if (await p.shouldAutostart()) plugins.push(p)
      })
    )
    return plugins
  }
}

export namespace PluginManager {
  export interface Props {
    parent: Instance
  }
}
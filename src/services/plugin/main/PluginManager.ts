import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import path from "path"
import yaml from "yaml"
import { Plugin } from "./Plugin"
import { PluginWorker } from "./PluginWorker"

export class PluginManager {

  readonly parent: Instance
  readonly baseDir: string
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
    return this.worker.stop()
  }

  /** starts the worker */
  start() {
    return this.worker.spawn()
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
      folders.map(async name => {
        const base = path.join(this.baseDir, name)
        try {
          const meta = yaml.parse(await fs.readFile(path.join(base, "meta.yaml"), "utf-8"))
          const plugin = new Plugin({ meta, parent: this, name })
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
    await this.worker.spawn()
  }

  /** retrieves a plugin by its name */
  getPluginByName(name: string) {
    return this.plugins.find(p => p.name === name)
  }

  async getPluginById(id: number) {
    let index = -1
    while (++index < this.plugins.length) {
      const pluginId = await this.plugins[index].fetchId()
      if (pluginId === id) return this.plugins[index]
    }
    throw new Error(`could not find plugin with id ${id}`)
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
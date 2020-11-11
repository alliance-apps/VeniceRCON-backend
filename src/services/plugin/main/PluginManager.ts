import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import path from "path"
import { Plugin } from "./Plugin"
import { PluginWorker } from "./PluginWorker"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { loadPluginMeta } from "./PluginUtil"

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

  get hasActivePlugin() {
    return this.plugins.some(plugin => plugin.entity.start)
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

  /** reloads all available plugins for this manager */
  async reloadPlugins() {
    const condition = await this.checkPrecondition()
    if (condition === PluginManager.PreCondition.PLUGIN_FOLDER_NOT_FOUND)
      return this.parent.log.info("skipping reload (plugin folder does not exist)")
    const entities = await pluginStore.getPluginsByInstance(this.parent)
    const ids = entities.map(plugin => plugin.id)
    const preAdd = this.plugins.length
    await Promise.all(entities.map(entity => this.reloadPlugin(entity)))
    const preRemove = this.plugins.length
    this.plugins = this.plugins.filter(plugin => ids.includes(plugin.id))
    if (
      (this.plugins.length !== preRemove || preRemove !== preAdd) &&
      !this.worker.isStopped
    ) {
      await this.worker.restart()
    } else if (this.hasActivePlugin && this.worker.isStopped) {
      await this.worker.spawn()
    }
  }

  /** reloads the single plugin */
  private async reloadPlugin(entity: PluginEntity) {
    let plugin = this.plugins.find(plugin => plugin.id === entity.id)
    if (!plugin) {
      const meta = await this.getMeta(entity)
      plugin = new Plugin({ meta, entity, parent: this })
      this.plugins.push(plugin)
    } else {
      plugin.entity = entity
    }
  }

  /** check preconditions if folder exists */
  private async checkPrecondition() {
    try {
      await fs.stat(this.baseDir)
      return PluginManager.PreCondition.OKAY
    } catch (e) {
      if (e.code !== "ENOENT") throw e
      return PluginManager.PreCondition.PLUGIN_FOLDER_NOT_FOUND
    }
  }

  private getMeta(entity: PluginEntity) {
    return loadPluginMeta(path.join(this.baseDir, entity.uuid, "meta.yaml"))
  }

  /** reloads all plugins for this instance from disk */
  async reloadPluginsOld() {
    const entities = await pluginStore.getPluginsByInstance(this.parent)
    const enabledUids = entities.map(e => e.uuid)
    const folders = (await fs.readdir(this.baseDir))
      .filter(folder => enabledUids.includes(folder))
    await Promise.allSettled(
      folders.map(async uuid => {
        const base = path.join(this.baseDir, uuid)
        try {
          const entity = await PluginEntity.findOneOrFail({ uuid })
          const plugin = new Plugin({
            meta: await loadPluginMeta(path.join(base, "meta.yaml")),
            parent: this,
            entity
          })
          if (!plugin.isCompatible())
            return this.parent.log.info(`ignoring plugin ${uuid} because backend is incompatible`)
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

  /** checks if a specific uuid exists in this plugin manager */
  hasPlugin(...uuid: string[]) {
    return this.plugins.some(plugin => uuid.includes(plugin.uuid))
  }

  getPluginById(id: number) {
    return this.plugins.find(plugin => plugin.id === id)
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

  export enum PreCondition {
    OKAY,
    PLUGIN_FOLDER_NOT_FOUND
  }
}
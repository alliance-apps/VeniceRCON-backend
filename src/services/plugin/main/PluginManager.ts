import { Instance } from "@service/battlefield/libs/Instance"
import { pluginStore } from "../"
import { promises as fs } from "fs"
import path from "path"
import { Plugin } from "./Plugin"
import { PluginWorker } from "./PluginWorker"
import { Plugin as PluginEntity } from "@entity/Plugin"

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

  get hasActivePlugin() {
    return this.plugins.some(plugin => plugin.entity.start)
  }

  get isRunning() {
    return this.worker.isRunning
  }

  get isStopped() {
    return this.worker.isStopped
  }

  /** sends a event to the worker */
  sendPluginEvent(name: string, data: any) {
    return this.worker.sendPluginEvent(name, data)
  }

  toJSON() {
    return Promise.all(this.plugins.map(plugin => plugin.toJSON()))
  }

  /** stops the worker */
  stop() {
    return this.worker.stop()
  }

  /** starts the worker */
  async start() {
    if (this.plugins.length === 0) return
    await this.worker.spawn()
  }

  /** reloads all available plugins for this manager */
  async reloadPlugins(force: boolean = false) {
    const condition = await this.checkPrecondition()
    if (condition === PluginManager.PreCondition.PLUGIN_FOLDER_NOT_FOUND)
      return this.parent.log.info("skipping reload (plugin folder does not exist)")
    const entities = await pluginStore.getPluginsByInstance(this.parent)
    const ids = entities.map(plugin => plugin.id)
    const preAdd = this.plugins.length
    await Promise.all(entities.map(entity => this.reloadPlugin(entity)))
    const preRemove = this.plugins.length
    this.plugins = this.plugins.filter(plugin => ids.includes(plugin.id))
    //check if worker needs to be restarted
    if (
      (this.plugins.length !== preRemove || preRemove !== preAdd) &&
      !this.worker.isStopped || force
    ) {
      await this.worker.restart()
    //check if worker start conditions are okay
    } else if (
      this.hasActivePlugin &&
      this.worker.isStopped &&
      this.parent.state.get("state") === Instance.State.CONNECTED
    ) {
      await this.worker.spawn()
    }
  }

  /** reloads the single plugin */
  private async reloadPlugin(entity: PluginEntity) {
    let plugin = this.plugins.find(plugin => plugin.id === entity.id)
    if (!plugin) {
      //plugin has been removed
      if (!(await this.checkPreconditionPlugin(entity.uuid)))
        return this.parent.log.warn(`not loading plugin uuid ${entity.uuid} precondition failed`)
      let meta: any
      try {
        meta = await Plugin.loadMeta(this.getPath(entity.uuid, "meta.yaml"))
      } catch (e) {
        this.parent.log.error(`could not load meta.yaml (plugin: ${entity.uuid})`)
        this.parent.log.error(e)
        return
      }
      plugin = new Plugin({ meta, entity, parent: this })
      this.plugins.push(plugin)
    } else {
      try {
        await plugin.reloadMeta()
      } catch (e) {
        this.parent.log.error(`could not reload meta.yaml (plugin: ${entity.uuid})`)
        this.parent.log.error(e)
        return
      }
      plugin.entity = entity
    }
  }

  /** retrieves the path to the plugin installation directory */
  getPath(uuid: string, file: string = "") {
    return path.join(this.baseDir, uuid, file)
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

  /** checks if the folder for a plugin exists */
  private async checkPreconditionPlugin(uuid: string) {
    try {
      await fs.stat(path.join(this.baseDir, uuid))
      return true
    } catch (e) {
      if (e.code === "ENOENT") return false
      throw e
    }
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
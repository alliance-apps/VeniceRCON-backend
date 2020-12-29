import { PluginManager } from "./PluginManager"
import { Meta } from "../schema"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { Context } from "koa"
import { promises as fs } from "fs"
import path from "path"
import { pluginStore } from ".."
import { loadPluginMeta } from "./PluginUtil"

export class Plugin {

  entity: PluginEntity
  readonly manager: PluginManager
  meta: Meta
  state: Plugin.State = Plugin.State.STOPPED
  private config: Record<string, any> = {}

  constructor(props: Plugin.Props) {
    this.manager = props.parent
    this.meta = props.meta
    this.entity = props.entity
  }

  get instance() {
    return this.manager.parent
  }

  get worker() {
    return this.manager.worker
  }

  get id() {
    return this.entity.id
  }

  get name() {
    return this.entity.name
  }

  get uuid() {
    return this.entity.uuid
  }

  executeRoute(method: string, path: string, ctx: Context) {
    return this.worker.executeRoute({ method, path, plugin: this.name, body: ctx.request.body })
  }

  /**
   * checks if the version is compatible with the instance type
   * @param version the battlefield or venice unleashed version backend
   */
  isCompatible() {
    switch (this.instance.version) {
      case InstanceContainer.Version.BF3:
        return this.meta.version === "BF3"
      case InstanceContainer.Version.VU:
        return true
    }
  }

  /** wether the plugin has been started or not */
  isRunning() {
    return this.state === Plugin.State.STARTED
  }

  /** retrieves the current plugin configuration */
  getConfig() {
    if (!this.meta.vars) return {}
    return {
      ...Object.fromEntries(this.meta.vars.map(v => [v.name, v.default])),
      ...this.config
    }
  }

  /**
   * updates the current configuration and saves it back to db
   * @param config updated values from the config
   */
  async updateConfig(config: Record<string, any>) {
    this.config = { ...this.getConfig(), ...config }
    await PluginEntity.update({ id: this.entity.id }, { config: JSON.stringify(this.config) })
    await this.entity.reload()
    if (this.state !== Plugin.State.STARTED) return
    await this.restart()
  }

  /** restarts the worker */
  restart() {
    if (this.state !== Plugin.State.STARTED) return this.start()
    return this.worker.restart()
  }

  /** sets the plugin to autostart after a reboot */
  async setAutostart(start: boolean) {
    await this.entity.update({ start })
  }

  /** returns wether the plugin should autostart or not */
  async shouldAutostart() {
    await this.entity.reload()
    return this.entity.start
  }

  /** starts the plugin if its not already running */
  async start() {
    if (this.state === Plugin.State.STARTED)
      return this.instance.log.info(`plugin ${this.name} already started`)
    try {
      await this.worker.startPlugin(this)
    } catch (e) {
      this.worker.instance.log.error(e.message)
      throw e
    }
  }

  /** stops the plugin if its currently running */
  stop() {
    if (this.state === Plugin.State.STOPPED) return this.instance.log.info(`plugin ${this.name} already stopped`)
    this.state = Plugin.State.STOPPED
    return this.worker.stopPlugin(this)
  }

  /** removes the plugin from the instance and disk */
  async remove() {
    await this.manager.stop()
    await Promise.all([
      await fs.rmdir(path.join(this.manager.baseDir, this.name), { recursive: true }),
      await this.entity.remove()
    ])
    await this.manager.reloadPlugins()
  }

  checkUpdate() {
    const store = pluginStore.getProvider(this.entity.storeId || 0)
    if (!store) return "0.0.0"
    const plugin = store.getPlugin(this.name)
    if (!plugin) return "0.0.0"
    return plugin.version
  }

  toJSON(): Plugin.Info {
    return {
      id: this.id,
      storeVersion: this.checkUpdate(),
      uuid: this.entity.uuid,
      store: this.entity.storeId,
      name: this.name,
      state: this.state,
      meta: this.meta,
      config: this.getConfig()
    }
  }

  async reloadMeta() {
    const path = this.manager.getPath(this.entity.uuid, "meta.yaml")
    this.meta = await Plugin.loadMeta(path)
  }

  static loadMeta(path: string) {
    return loadPluginMeta(path)
  }
}

export namespace Plugin {
  export interface Props {
    parent: PluginManager
    meta: Meta
    entity: PluginEntity
  }

  export enum State {
    STOPPED,
    STARTED
  }

  export interface Info {
    id: number
    store: number|null
    storeVersion: string
    uuid: string
    name: string
    state: number
    meta: Meta
    config: Record<string, any>
  }
}
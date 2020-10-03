import { PluginManager } from "./PluginManager"
import { Meta, metaSchema } from "../schema"
import { InstanceContainer } from "@service/container/InstanceContainer"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { Context } from "koa"
import { promises as fs } from "fs"
import path from "path"

export class Plugin {

  private id: number = 0
  readonly manager: PluginManager
  readonly name: string
  readonly meta: Meta
  state: Plugin.State = Plugin.State.STOPPED
  private config: Record<string, any> = {}

  constructor(props: Plugin.Props) {
    this.manager = props.parent
    this.meta = props.meta
    this.name = props.name
  }

  get instance() {
    return this.manager.parent
  }

  get worker() {
    return this.manager.worker
  }

  /** fetches the entity id */
  async fetchId() {
    if (this.id === 0) await this.getEntity()
    return this.id
  }

  /** checks if the plugin is valid */
  async validate() {
    await metaSchema.validate(this.meta)
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

  private async getEntity() {
    let entity = await PluginEntity.findOne({
      instanceId: this.instance.id,
      name: this.name
    })
    if (!entity) {
      entity = await PluginEntity.from({
        name: this.name,
        version: this.meta.version,
        instance: this.instance.id
      })
    }
    this.id = entity.id
    return entity
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
    this.config = {
      ...this.getConfig(),
      ...config
    }
    return PluginEntity.updateConfig(await this.fetchId(), config)
  }

  /** sets the plugin to autostart after a reboot */
  async setAutostart(set: boolean) {
    const entity = await this.getEntity()
    entity.start = set
    await entity.save()
  }

  /** returns wether the plugin should autostart or not */
  async shouldAutostart() {
    return (await this.getEntity()).start
  }

  /** starts the plugin if its not already running */
  async start() {
    if (this.state === Plugin.State.STARTED) return null
    this.state = Plugin.State.STARTED
    try {
      await this.worker.startPlugin(this)
    } catch (e) {
      this.worker.instance.log.error(e.message)
      throw e
    }
  }

  /** stops the plugin if its currently running */
  stop() {
    if (this.state === Plugin.State.STOPPED) return null
    this.state = Plugin.State.STOPPED
    return this.worker.stopPlugin(this)
  }

  /** removes the plugin from the instance and disk */
  async remove() {
    await this.manager.stop()
    await fs.rmdir(path.join(this.manager.baseDir, this.name), { recursive: true })
    await this.manager.reloadPlugins()
  }

  async toJSON(): Promise<Plugin.Info> {
    return {
      id: await this.fetchId(),
      name: this.name,
      state: this.state,
      meta: this.meta,
      config: this.getConfig()
    }
  }

}

export namespace Plugin {
  export interface Props {
    parent: PluginManager
    meta: Meta
    name: string
  }

  export enum State {
    STOPPED,
    STARTED
  }

  export interface Info {
    id: number
    name: string
    state: number
    meta: Meta
    config: Record<string, any>
  }
}
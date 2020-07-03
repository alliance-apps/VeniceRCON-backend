import { Instance } from "@service/battlefield/Instance"
import { PluginManager } from "./PluginManager"
import { Plugin } from "./Plugin"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { PluginWorker } from "./PluginWorker"

export class InstancePlugin {

  readonly parent: Instance
  private manager: PluginManager
  private plugins: Plugin[] = []
  readonly worker: PluginWorker

  constructor(props: InstancePlugin.Props) {
    this.parent = props.instance
    this.manager = props.manager
    this.worker = new PluginWorker({
      parent: this, baseDir: this.manager.baseDir
    })
    this.initialize()
  }

  private async initialize() {
    this.plugins = await this.loadPlugins()
  }

  private async loadPlugins() {
    const entities = await PluginEntity.find({ instanceId: this.parent.id })
    return entities
      .map(entity => {
        const bp = this.manager.getBlueprint(entity.name, this.backend)
        return bp ? bp.fromEntity(this.worker, entity) : undefined
      })
      .filter(bp => bp instanceof Plugin) as Plugin[]
  }

  private get backend() {
    return this.parent.state.get("version")
  }

  async stop() {
    throw new Error("not implemented")
  }

  /** retrieves a list of useable plugins */
  available() {
    return this.manager.getPlugins(this.backend)
  }

  /** gets a list of created plugins */
  created() {
    return this.plugins
  }

  enabled() {
    return PluginEntity.find
  }

  async getEnabledPlugins() {
    const ids = (await PluginEntity.find({
      where: {
        instanceId: this.parent.id,
        start: true
      },
      select: ["id"]
    })).map(({ id }) => id)
    return this.created().filter(plugin => ids.includes(plugin.id))
  }

  /** retrieves a single plugin for this instance */
  findId(id: number) {
    return this.plugins.find(p => p.id === id)
  }

  /** creates a new plugin from the plugin identifier */
  async create(identifier: string) {
    const bp = this.manager.getBlueprint(identifier, this.backend)
    if (!bp) throw new Error(`no plugin with identifier ${identifier} and backend ${this.backend} found!`)
    const plugin = await bp.create(this.parent)
    this.plugins.push(plugin)
    return plugin
  }

}

export namespace InstancePlugin {
  export interface Props {
    instance: Instance
    manager: PluginManager
  }
}
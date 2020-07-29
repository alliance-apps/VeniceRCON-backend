import type { Plugin as PluginType } from "../main/Plugin"
import { PluginHandler } from "./PluginHandler"

export class WorkerPlugin {

  parent: PluginHandler
  path: string
  state: WorkerPlugin.State = WorkerPlugin.State.STOPPED
  readonly info: PluginType.Info
  exported: any

  constructor(props: WorkerPlugin.Props) {
    this.parent = props.parent
    this.path = props.path
    this.info = props.info
  }

  async start() {
    if (this.state !== WorkerPlugin.State.STOPPED)
      throw new Error(`Plugin is not in state stopped! got state ${this.state}`)
    this.state = WorkerPlugin.State.STARTED
    this.exported = await require(this.path)({
      config: await this.getConfig(),
      battlefield: this.parent.battlefield,
      dependency: this.getDependencies()
    })
  }

  private getDependencies(): Record<string, any> {
    if (!this.info.meta.dependency || this.info.meta.dependency.length === 0) return {}
    const dependency: Record<string, any> = {}
    this.info.meta.dependency.forEach(name => {
      const plugin = this.parent.getPluginByName(name)
      if (!plugin) throw new Error(`could not find dependency ${name} for plugin ${this.info.name}`)
      dependency[name] = plugin.exported
    })
    return dependency
  }

  getConfig(): Promise<Record<string, any>> {
    return this.parent.messenger.send("GET_PLUGIN_CONFIG", { id: this.info.id })
  }
}

export namespace WorkerPlugin {
  export interface Props {
    parent: PluginHandler
    path: string
    info: PluginType.Info
  }

  export type Create = Omit<Props, "code">

  export enum State {
    STOPPED = 0,
    STARTED = 1
  }
}
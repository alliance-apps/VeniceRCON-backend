import { Battlefield } from "vu-rcon"
import type { Plugin as PluginType, Plugin } from "../main/Plugin"
import { PluginHandler } from "./PluginHandler"
import { PluginLogger } from "./util/PluginLogger"
import { PluginRouter } from "./util/PluginRouter"
import { PluginStore } from "./util/PluginStore"
import path from "path"
import { PluginEngine } from "./util/PluginEngine"

export class WorkerPlugin {

  parent: PluginHandler
  basePath: string
  state: WorkerPlugin.State = WorkerPlugin.State.STOPPED
  readonly info: PluginType.Info
  exported: any
  router: PluginRouter = new PluginRouter()
  engine: PluginEngine
  logger: PluginLogger

  constructor(props: WorkerPlugin.Props) {
    this.parent = props.parent
    this.basePath = props.basePath
    this.info = props.info
    this.engine = new PluginEngine({ messenger: this.parent.messenger, battlefield: this.parent.battlefield })
    this.logger = new PluginLogger(this.parent.messenger, this.info.name)
  }

  get meta() {
    return this.info.meta
  }

  get indexPath() {
    return path.join(this.basePath, this.info.meta.entry)
  }

  get storePath() {
    return path.join(this.basePath, ".meta", "store.json")
  }

  async start() {
    if (this.state !== WorkerPlugin.State.STOPPED)
      throw new Error(`Plugin is not in state stopped! got state ${this.state}`)
    this.state = WorkerPlugin.State.STARTED
    const callback = require(this.indexPath)
    if (typeof callback !== "function") throw new Error(`expected a function as export in plugin "${this.info.name}" but received ${typeof callback}`)
    this.exported = await callback(await this.getPluginProps())
  }

  private async getPluginProps() {
    const props: WorkerPlugin.PluginProps = {
      config: await this.getConfig(),
      battlefield: this.parent.battlefield,
      dependency: this.getDependencies(),
      logger: this.logger,
      store: await PluginStore.from({ file: this.storePath }),
      router: this.router,
      engine: await this.engine
    }
    return props
  }

  private getDependencies(): Record<string, any> {
    const dependency: Record<string, any> = {}
    this.info.meta.dependency.forEach(name => {
      const plugin = this.parent.getPluginByName(name)
      if (!plugin) throw new Error(`could not find required dependency ${name} for plugin ${this.info.name}`)
      dependency[name] = plugin.exported
    })
    this.info.meta.optionalDependency.forEach(name => {
      const plugin = this.parent.getPluginByName(name)
      if (!plugin) return this.logger.info(`skipping optional dependency "${name}"`)
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
    basePath: string
    info: Plugin.Info
  }

  export interface PluginProps {
    config: Record<string, any>
    battlefield: Battlefield
    dependency: Record<string, any>
    logger: PluginLogger
    router?: PluginRouter
    store: PluginStore
    engine: PluginEngine
  }

  export type Create = Omit<Props, "code">

  export enum State {
    STOPPED = 0,
    STARTED = 1
  }
}
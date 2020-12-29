import { Messenger } from "../shared/messenger/Messenger"
import path from "path"
import { WorkerPlugin } from "./WorkerPlugin"
import { PluginState, WorkerState } from "../shared/state"
import { Battlefield } from "vu-rcon"
import type { PluginWorker } from "../main/PluginWorker"
import { PluginLogger } from "./util/PluginLogger"

export class PluginHandler {

  private basePath: string
  readonly messenger: Messenger
  readonly instanceId: number
  private plugins: WorkerPlugin[] = []
  battlefield!: Battlefield
  private state: WorkerState = WorkerState.UNKNOWN
  private logger: PluginLogger

  constructor(props: PluginHandler.Props) {
    this.messenger = props.messenger
    this.basePath = props.basePath
    this.instanceId = props.instanceId
    this.messenger.on("startPlugin", this.onStartPlugin.bind(this))
    this.messenger.on("executeRoute", this.executeRoute.bind(this))
    this.messenger.on("pluginState", this.onPluginState.bind(this))
    this.state = WorkerState.INIT
    this.init(props.rcon)
    this.logger = new PluginLogger(this.messenger, "PLUGIN_WORKER")
  }

  private async init(options: PluginHandler.BattlefieldOpts) {
    this.battlefield = await Battlefield.connect(options)
    this.state = WorkerState.READY
    process.on("uncaughtException", this.handleUncaughtException.bind(this))
    process.on("unhandledRejection", this.handleUncaughtException.bind(this))
    await this.messenger.send("STATE", WorkerState.READY)
  }

  private handleUncaughtException(error: Error) {
    const plugin = this.getExceptionPlugin(error)
    if (plugin) {
      plugin.logger.error("unhandled exception")
      plugin.logger.error(error.stack)
    } else {
      this.logger.error("unhandled exception")
      this.logger.error(error.stack)
    }
  }

  /**
   * tries to get the plugin which possibly sent the error from the stack
   * @param error error with the stack attached
   */
  private getExceptionPlugin(error: Error): WorkerPlugin|undefined {
    const stack = error.stack
    if (!stack) return
    const basePath = this.basePath.replace(".", "\\.").replace("\\", "\\\\")
    const match = stack.match(new RegExp(`${basePath}\\/([a-f0-9]{32})\\/`))
    if (!match) return
    return this.getPluginByUUID(match[1])
  }

  /**
   * retrieves a specific plugin by its name
   * @param name the name of the plugin
   */
  getPluginByName(name: string) {
    return this.plugins.find(p => p.info.name === name)
  }

  /**
   * retrieves a plugin by its uuid
   * @param uuid the plugin uuid
   */
  getPluginByUUID(uuid: string) {
    return this.plugins.find(p => p.info.uuid === uuid)
  }

  private async executeRoute({ message }: Messenger.Event<PluginWorker.ExecuteRouteProps>) {
    const plugin = this.getPluginByName(message.data.plugin)
    if (!plugin) return message.except("Plugin not running on worker!")
    try {
      message.done(await plugin.router._executeRoute(message.data))
    } catch (e) {
      message.except(e.message)
    }
  }

  private onPluginState({ message }: Messenger.Event<{ id: number }>) {
    const plugin = this.plugins.find(plugin => plugin.info.id === message.data.id)
    if (!plugin) return message.done({ state: PluginState.NOT_RUNNING })
    return message.done({ state: PluginState.RUNNING })
  }

  private async onStartPlugin({ message }: Messenger.Event) {
    if (this.state !== WorkerState.READY) return message.except("Worker not ready")
    const plugin = new WorkerPlugin({
      parent: this,
      basePath: path.join(this.basePath, message.data.uuid),
      info: message.data
    })
    this.plugins.push(plugin)
    try {
      await plugin.start()
      message.done()
    } catch (e) {
      message.except(e)
    }
  }
}

export namespace PluginHandler {
  export interface Props {
    messenger: Messenger
    basePath: string
    instanceId: number
    rcon: BattlefieldOpts
  }

  export type BattlefieldOpts = Pick<Battlefield.Options, "host"|"port"|"password">
}
import { Messenger } from "../shared/messenger/Messenger"
import path from "path"
import { WorkerPlugin } from "./WorkerPlugin"
import { State } from "../shared/state"
import { Battlefield } from "vu-rcon"
import type { PluginWorker } from "../main/PluginWorker"

export class PluginHandler {

  private basePath: string
  readonly messenger: Messenger
  private plugins: WorkerPlugin[] = []
  private instanceId: number
  battlefield!: Battlefield
  private state: State = State.UNKNOWN

  constructor(props: PluginHandler.Props) {
    this.messenger = props.messenger
    this.basePath = props.basePath
    this.instanceId = props.instanceId
    this.messenger.on("startPlugin", this.onStartPlugin.bind(this))
    this.messenger.on("executeRoute", this.executeRoute.bind(this))
    this.state = State.INIT
    this.init(props.rcon)
  }

  private async init(options: PluginHandler.BattlefieldOpts) {
    this.battlefield = await Battlefield.connect(options)
    this.state = State.READY
    await this.messenger.send("STATE", State.READY)
  }

  /**
   * retrieves a specific plugin by its name
   * @param name the name of the plugin
   */
  getPluginByName(name: string) {
    return this.plugins.find(p => p.info.name === name)
  }

  private async executeRoute({ message }: Messenger.Event<PluginWorker.ExecuteRouteProps>) {
    const plugin = this.getPluginByName(message.data.plugin)
    if (!plugin) return message.except("Plugin not running on worker!")
    try {
      message.done(await plugin.router.executeRoute(message.data))
    } catch (e) {
      message.except(e.message)
    }
  }

  private async onStartPlugin({ message }: Messenger.Event) {
    if (this.state !== State.READY) return message.except("Worker not ready")
    const plugin = new WorkerPlugin({
      parent: this,
      path: path.join(this.basePath, message.data.name, message.data.meta.entry),
      info: message.data
    })
    this.plugins.push(plugin)
    try {
      await plugin.start()
      message.done()
    } catch (e) {
      message.except(e.message)
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
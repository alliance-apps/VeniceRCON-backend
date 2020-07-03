import { Messenger } from "../shared/messenger/Messenger"
import path from "path"
import { Plugin } from "./Plugin"

export class PluginHandler {

  private basePath: string
  private messenger: Messenger
  private plugins: Plugin[] = []

  constructor(props: PluginHandler.Props) {
    this.messenger = props.messenger
    this.basePath = props.basePath
    this.messenger.on("startPlugin", this.onStartPlugin.bind(this))
  }

  private async onStartPlugin({ message }: Messenger.Event) {
    console.log("start plugin", message.data)
    const file = path.join(this.basePath, message.data.name, message.data.meta.entry)
    const plugin = await Plugin.from({ path: file })
    this.plugins.push(plugin)
    plugin.start()
    message.done()
  }
}

export namespace PluginHandler {
  export interface Props {
    messenger: Messenger
    basePath: string
  }
}
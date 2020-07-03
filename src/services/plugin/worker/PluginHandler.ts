import { Messenger } from "../shared/messenger/Messenger"
import path from "path"

export class PluginHandler {

  private basePath: string
  private messenger: Messenger

  constructor(props: PluginHandler.Props) {
    this.messenger = props.messenger
    this.basePath = props.basePath
    this.messenger.on("startPlugin", this.onStartPlugin.bind(this))
    this.messenger.on("stopPlugin", this.onStopPlugin.bind(this))
  }

  private onStartPlugin({ message }: Messenger.Event) {
    console.log("start plugin", message.data)
    require(path.join(this.basePath, message.data.name, message.data.meta.entry))
    message.done()
  }

  private onStopPlugin({ message }: Messenger.Event) {
    console.log("stop plugin", message.data)
    message.done()
  }
}

export namespace PluginHandler {
  export interface Props {
    messenger: Messenger
    basePath: string
  }
}
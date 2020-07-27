import type { Plugin as PluginType } from "../main/Plugin"
import { PluginHandler } from "./PluginHandler"

export class Plugin {

  parent: PluginHandler
  path: string
  state: Plugin.State = Plugin.State.STOPPED
  readonly info: PluginType.Info
  exported: any

  constructor(props: Plugin.Props) {
    this.parent = props.parent
    this.path = props.path
    this.info = props.info
  }

  async start() {
    if (this.state !== Plugin.State.STOPPED)
      throw new Error(`Plugin is not in state stopped! got state ${this.state}`)
    this.state = Plugin.State.STARTED
    this.exported = await require(this.path)({
      config: await this.getConfig(),
      battlefield: this.parent.battlefield
    })
  }

  getConfig(): Promise<Record<string, any>> {
    return this.parent.messenger.send("GET_PLUGIN_CONFIG", { id: this.info.id })
  }
}

export namespace Plugin {
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
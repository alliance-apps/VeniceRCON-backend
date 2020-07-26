import vm from "vm"
import { promises as fs } from "fs"
import type { Plugin as PluginType } from "../main/Plugin"
import { ContextHelper } from "./ContextHelper"
import { PluginHandler } from "./PluginHandler"

export class Plugin {

  parent: PluginHandler
  path: string
  script: vm.Script
  state: Plugin.State = Plugin.State.STOPPED
  readonly info: PluginType.Info
  context: ContextHelper

  constructor(props: Plugin.Props) {
    this.parent = props.parent
    this.path = props.path
    this.info = props.info
    this.context = new ContextHelper({ parent: this })
    this.script = this.createScript(props.code)
  }

  private createScript(code: string) {
    return new vm.Script(code, { filename: this.path })
  }

  async start() {
    if (this.state !== Plugin.State.STOPPED)
      throw new Error(`Plugin is not in state stopped! got state ${this.state}`)
    this.state = Plugin.State.STARTED
    this.script.runInNewContext(await this.context.create(), {
      displayErrors: true,
      breakOnSigint: true
    })
  }

  getConfig(): Promise<Record<string, any>> {
    return this.parent.messenger.send("GET_PLUGIN_CONFIG", { id: this.info.id })
  }

  static async from(props: Plugin.Create) {
    return new Plugin({
      ...props,
      code: await fs.readFile(props.path, "utf8")
    })
  }
}

export namespace Plugin {
  export interface Props {
    parent: PluginHandler
    path: string
    code: string
    info: PluginType.Info
  }

  export type Create = Omit<Props, "code">

  export enum State {
    STOPPED = 0,
    STARTED = 1
  }
}
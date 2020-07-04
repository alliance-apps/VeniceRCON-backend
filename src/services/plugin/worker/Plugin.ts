import vm from "vm"
import { promises as fs } from "fs"
import type { Plugin as PluginType } from "../main/Plugin"
import { ContextHelper } from "./ContextHelper"

export class Plugin {

  path: string
  script: vm.Script
  state: Plugin.State = Plugin.State.STOPPED
  readonly info: PluginType.Info
  context: ContextHelper

  constructor(props: Plugin.Props) {
    this.path = props.path
    this.info = props.info
    this.context = new ContextHelper({ parent: this })
    this.script = this.createScript(props.code)
  }

  private createScript(code: string) {
    return new vm.Script(code, { filename: this.path })
  }

  start() {
    if (this.state !== Plugin.State.STOPPED)
      throw new Error(`Plugin is not in state stopped! got state ${this.state}`)
    this.state = Plugin.State.STARTED
    this.script.runInNewContext(this.context.create(), {
      displayErrors: true,
      breakOnSigint: true
    })
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
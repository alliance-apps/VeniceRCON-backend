import { Plugin as PluginEntity } from "@entity/Plugin"
import { PluginBlueprint } from "./PluginBlueprint"
import vm from "vm"
import { promises as fs } from "fs"
import path from "path"

export class Plugin {

  id: number
  private blueprint: PluginBlueprint
  state: Plugin.State = Plugin.State.STOPPED
  private sandbox: any

  constructor(props: Plugin.Props) {
    this.id = props.entity.id
    this.blueprint = props.blueprint
  }

  private async run() {
    const script = await fs.readFile(path.join(this.blueprint.basePath, this.blueprint.meta.entry), "utf8")
    const ctx = vm.createContext(this.createContext())
    this.sandbox = vm.runInContext(script, ctx)
  }

  private createContext() {
    return {}
  }

  private async parseConfig() {
    const entity = await PluginEntity.findOneOrFail({ id: this.id })
    if (!this.blueprint.meta.vars) return {}
    return {
      ...Object.fromEntries(this.blueprint.meta.vars.map(v => [v.name, v.default])),
      ...entity.getConfig()
    }
  }

  async start() {
    if (this.state === Plugin.State.STARTED) return
    this.state = Plugin.State.STARTED
    this.run()
  }

  async stop() {
    if (this.state === Plugin.State.STOPPED) return

  }

}

export namespace Plugin {
  export interface Props {
    entity: PluginEntity
    blueprint: PluginBlueprint
  }

  export enum State {
    STOPPED,
    STARTED
  }

}
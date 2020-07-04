import { Plugin as PluginEntity } from "@entity/Plugin"
import { PluginBlueprint } from "./PluginBlueprint"
import { PluginWorker } from "./PluginWorker"

export class Plugin {

  readonly id: number
  readonly name: string
  private blueprint: PluginBlueprint
  private worker: PluginWorker
  state: Plugin.State = Plugin.State.STOPPED
  private config: Record<string, any>

  constructor(props: Plugin.Props) {
    this.id = props.entity.id
    this.name = props.entity.name
    this.worker = props.worker
    this.blueprint = props.blueprint
    this.config = props.entity.getConfig()
  }

  get meta() {
    return this.blueprint.meta
  }

  getConfig() {
    if (!this.blueprint.meta.vars) return {}
    return {
      ...Object.fromEntries(this.blueprint.meta.vars.map(v => [v.name, v.default])),
      ...this.config
    }
  }

  async setAutostart(start: boolean) {
    const entity = await PluginEntity.findOneOrFail({ where: { id: this.id } })
    if (entity.start === start) return
    await entity.update({ start })
  }

  start() {
    if (this.state === Plugin.State.STARTED) return null
    this.state = Plugin.State.STARTED
    return this.worker.startPlugin(this)
  }

  stop() {
    if (this.state === Plugin.State.STOPPED) return null
    this.state = Plugin.State.STOPPED
    return this.worker.stopPlugin(this)
  }

  toJSON(): Plugin.Info {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      meta: this.meta,
      config: this.getConfig()
    }
  }

}

export namespace Plugin {

  export interface Props {
    worker: PluginWorker
    entity: PluginEntity
    blueprint: PluginBlueprint
  }

  export interface Info {
    id: number
    name: string
    state: number
    meta: PluginBlueprint.Meta
    config: Record<string, any>
  }

  export enum State {
    STOPPED,
    STARTED
  }

}
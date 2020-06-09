import winston from "winston"
import { metaSchema } from "../schema"
import { Instance } from "@service/battlefield/Instance"
import { Plugin as PluginEntity } from "@entity/Plugin"

export class PluginBlueprint {

  readonly id: string
  meta: PluginBlueprint.Meta
  private basePath: string

  constructor(props: PluginBlueprint.Props) {
    this.id = props.id
    this.meta = props.meta
    this.basePath = props.basePath
    winston.verbose(`loaded plugin "${this.meta.name}" (v${this.meta.version})`)
  }

  async stop() {
    throw new Error("Plugin#stop not implemented")
  }

  /**
   * retrieves a plugin entity
   * @param instance instance to get the entity for
   * @param upsert create the plugin entity if not exists?
   */
  private async getPluginEntity(instance: Instance, upsert: true): Promise<PluginEntity>
  private async getPluginEntity(instance: Instance, upsert: false): Promise<PluginEntity|undefined>
  private async getPluginEntity(instance: Instance, upsert: boolean = false) {
    let entity = await PluginEntity.findOne({ instanceId: instance.id, name: this.id })
    if (!upsert) return entity
    if (!entity && upsert) {
      entity = await PluginEntity.from({
        name: this.id,
        version: this.meta.version,
        instance: instance.id
      })
    }
    return entity
  }

  /**
   * creates a new plugin instance for this specific plugin
   * @param instance
   */
  async createInstance(instance: Instance) {
    const entity = this.getPluginEntity(instance, true)
    throw new Error("Plugin#startInstance not impleneted")
  }

  static validateMeta(meta: PluginBlueprint.Meta) {
    return metaSchema.validate(meta, { allowUnknown: true })
  }
}

export namespace PluginBlueprint {
  export interface Props {
    id: string
    meta: Meta
    basePath: string
  }

  export interface Meta {
    name: string
    description?: string
    version: string
    backend: "JS"
    entry: string
    vars?: PluginVariable[]
  }

  export type PluginVariable =
    PluginStringVariable |
    PluginNumberVariable |
    PluginBooleanVariable

  export interface PluginBaseVariable {
    name: string
    description: string
  }

  export interface PluginStringVariable extends PluginBaseVariable {
    type: "string"
    default: string
  }

  export interface PluginNumberVariable extends PluginBaseVariable {
    type: "number"
    default: number
  }

  export interface PluginBooleanVariable extends PluginBaseVariable {
    type: "boolean"
    default: boolean
  }
}
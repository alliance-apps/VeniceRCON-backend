import winston from "winston"
import { metaSchema } from "../schema"
import { Instance } from "@service/battlefield/Instance"
import { Plugin as PluginEntity } from "@entity/Plugin"
import { Plugin } from "./Plugin"
import { PluginWorker } from "./PluginWorker"
import { Meta } from "../schema"

export class PluginBlueprint {

  readonly id: string
  meta: Meta
  readonly basePath: string

  constructor(props: PluginBlueprint.Props) {
    this.id = props.id
    this.meta = props.meta
    this.basePath = props.basePath
    winston.verbose(`loaded plugin "${this.meta.name}" (v${this.meta.version})`)
  }

  async stop() {
    throw new Error("PluginBlueprint#stop not implemented")
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
  async create(instance: Instance) {
    const entity = await this.getPluginEntity(instance, true)
    const plugin = new Plugin({ worker: instance.plugin.worker, entity, blueprint: this })
    return plugin
  }

  /** creates a new plugin from an existing entity */
  fromEntity(worker: PluginWorker, entity: PluginEntity) {
    return new Plugin({ worker, entity, blueprint: this })
  }

  static validateMeta(meta: Meta) {
    return metaSchema.validate(meta, { allowUnknown: true })
  }
}

export namespace PluginBlueprint {
  export interface Props {
    id: string
    meta: Meta
    basePath: string
  }

}
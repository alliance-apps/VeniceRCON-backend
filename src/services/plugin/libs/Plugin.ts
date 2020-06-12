import { Plugin as PluginEntity } from "@entity/Plugin"
import { PluginBlueprint } from "./PluginBlueprint"
import vm from "vm"
import { Worker } from "worker_threads"
import path from "path"
import winston from "winston"
import chalk from "chalk"
import { Instance } from "@service/battlefield/Instance"

export class Plugin {

  id: number
  private parent: Instance
  private blueprint: PluginBlueprint
  state: Plugin.State = Plugin.State.STOPPED
  private worker: Worker|undefined
  private config: Record<string, any>

  constructor(props: Plugin.Props) {
    this.parent = props.instance
    this.id = props.entity.id
    this.blueprint = props.blueprint
    this.config = props.entity.getConfig()
  }

  get meta() {
    return this.blueprint.meta
  }

  private async run() {
    const file = path.join(this.blueprint.basePath, this.blueprint.meta.entry)
    const prefix = chalk.cyan(`[${this.meta.name}]`)
    this.worker = new Worker(path.join(__dirname, "../plugin/worker.js"), {
      workerData: {
        path: file
      }
    })
    this.worker.on("online", () => winston.info(`${prefix} Started`))
    this.worker.on("error", err => winston.error(prefix, err))
    this.worker.on("exit", code => {
      if (!this.worker) throw new Error("worker exited but plugin has no worker assigned")
      this.worker.removeAllListeners()
      winston.info(`${prefix} exited with code ${code}`)
    })
  }

  getConfig() {
    if (!this.blueprint.meta.vars) return {}
    return {
      ...Object.fromEntries(this.blueprint.meta.vars.map(v => [v.name, v.default])),
      ...this.config
    }
  }

  async start() {
    if (this.state === Plugin.State.STARTED) return
    this.state = Plugin.State.STARTED
    await this.run()
  }

  async stop() {
    if (this.state === Plugin.State.STOPPED) return
    throw new Error("not implemented")
  }

  toJSON() {
    return {
      id: this.id,
      state: this.state,
      meta: this.meta,
      config: this.getConfig()
    }
  }

}

export namespace Plugin {
  export interface Props {
    instance: Instance
    entity: PluginEntity
    blueprint: PluginBlueprint
  }

  export enum State {
    STOPPED,
    STARTED
  }

}
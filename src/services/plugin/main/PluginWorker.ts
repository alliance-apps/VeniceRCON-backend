import { Worker } from "worker_threads"
import { InstancePlugin } from "./InstancePlugin"
import path from "path"
import winston from "winston"
import { Plugin } from "./Plugin"
import { Messenger } from "../shared/messenger/Messenger"

export class PluginWorker {
  private worker: Worker|undefined
  private messenger: Messenger|undefined
  private parent: InstancePlugin
  private baseDir: string

  constructor(props: PluginWorker.Props) {
    this.parent = props.parent
    this.baseDir = props.baseDir
    this.start()
  }

  get instance() {
    return this.parent.parent
  }

  private async start() {
    await this.createWorker()
    const plugins = await this.parent.getEnabledPlugins()
    await Promise.all(plugins.map(p => p.start()))
  }

  private createWorker() {
    return new Promise(fulfill => {
      const worker = new Worker(
        path.join(__dirname, "../worker/worker.js"),
        { workerData: { baseDir: this.baseDir } }
      )
      this.worker = worker
      let messenger: Messenger
      worker.once("message", async msg => {
        if (msg !== "ready") throw new Error(`expected message to be "ready" received ${msg}`)
        messenger = await Messenger.create(p => worker.postMessage(p, [p]))
        this.messenger = messenger
        fulfill()
      })
      worker.on("online", () => winston.info(`Plugin worker started (instance ${this.instance.id})`))
      worker.on("error", err => winston.error(err))
      worker.on("exit", code => {
        winston.info(`worker exited with code ${code} )instance ${this.instance.id})`)
        worker.removeAllListeners()
        messenger.removeAllListeners()
      })
    })
  }

  stop() {
    if (!this.worker) return
    this.worker.terminate()
  }

  async restart() {
    this.stop()
    await this.start()
  }

  private sendMessage(action: string, data: any) {
    if (!this.messenger) throw new Error("messenger not ready!")
    return this.messenger.send(action, data)
  }

  async startPlugin(plugin: Plugin) {
    winston.info(`Starting plugin: ${plugin.name} (instance ${this.instance.id})`)
    await plugin.setAutostart(true)
    return this.sendMessage("startPlugin", plugin.toJSON())
  }

  async stopPlugin(plugin: Plugin) {
    await plugin.setAutostart(false)
    this.restart()
  }
}

export namespace PluginWorker {
  export interface Props {
    parent: InstancePlugin
    baseDir: string
  }
}
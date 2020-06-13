import { Worker, MessageChannel } from "worker_threads"
import { InstancePlugin } from "./InstancePlugin"
import path from "path"
import winston from "winston"
import { Plugin } from "./Plugin"
import { Messenger } from "../shared/Messenger"

export class PluginWorker {
  private worker: Worker|undefined
  private messenger: Messenger|undefined
  private parent: InstancePlugin
  private ackId: number = 0
  private baseDir: string

  constructor(props: PluginWorker.Props) {
    const channels = new MessageChannel()
    this.parent = props.parent
    this.baseDir = props.baseDir
    this.start()
  }

  private start() {
    return new Promise(fulfill => {
      const worker = new Worker(
        path.join(__dirname, "../worker/worker.js"),
        { workerData: { baseDir: this.baseDir } }
      )
      this.worker = worker
      worker.once("message", async msg => {
        if (msg !== "ready") throw new Error(`expected message to be "ready" received ${msg}`)
        this.messenger = await Messenger.create(p => worker.postMessage(p, [p]))
        fulfill()
      })
      worker.on("online", () => winston.info("Plugin worker started"))
      worker.on("error", err => winston.error(err))
      worker.on("exit", code => {
        winston.info(`worker exited with code ${code}`)
        worker.removeAllListeners()
      })
    })
  }

  private emit(action: string, data: any) {
    if (!this.worker) throw new Error("worker not active")
    this.worker.postMessage({ action, data })
  }

  stop() {
    if (!this.worker) return
    this.worker.terminate()
  }

  startPlugin(plugin: Plugin) {
    this.emit("addPlugin", plugin.toJSON())
  }

  stopPlugin(plugin: Plugin) {
    this.emit("delPlugin", plugin.toJSON())
  }
}

export namespace PluginWorker {
  export interface Props {
    parent: InstancePlugin
    baseDir: string
  }
}
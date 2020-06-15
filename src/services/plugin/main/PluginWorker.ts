import { Worker } from "worker_threads"
import { InstancePlugin } from "./InstancePlugin"
import path from "path"
import winston from "winston"
import { Plugin } from "./Plugin"
import { Messenger } from "../shared/Messenger"
import { SharedRcon } from "../shared/classes/Rcon"

export class PluginWorker {
  private sharedRcon: SharedRcon|undefined
  private worker: Worker|undefined
  private messenger: Messenger|undefined
  private parent: InstancePlugin
  private baseDir: string

  constructor(props: PluginWorker.Props) {
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
      let messenger: Messenger
      worker.once("message", async msg => {
        if (msg !== "ready") throw new Error(`expected message to be "ready" received ${msg}`)
        messenger = await Messenger.create(p => worker.postMessage(p, [p]))
        this.createSharedRcon(messenger)
        this.messenger = messenger
        fulfill()
      })
      worker.on("online", () => winston.info("Plugin worker started"))
      worker.on("error", err => winston.error(err))
      worker.on("exit", code => {
        winston.info(`worker exited with code ${code}`)
        if (this.sharedRcon) {
          this.sharedRcon.$remove()
          this.sharedRcon = undefined
        }
        worker.removeAllListeners()
        messenger.removeAllListeners()
      })
    })
  }

  private createSharedRcon(messenger: Messenger) {
    this.sharedRcon = SharedRcon.create({
      rcon: this.getRconConnection(),
      messenger
    })
  }

  private getRconConnection() {
    return this.parent.parent.connection.battlefield
  }

  private sendMessage(action: string, data: any) {
    if (!this.messenger) throw new Error("messenger not ready!")
    return this.messenger.send(action, data)
  }

  stop() {
    if (!this.worker) return
    this.worker.terminate()
  }

  startPlugin(plugin: Plugin) {
    return this.sendMessage("startPlugin", plugin.toJSON())
  }

  stopPlugin(plugin: Plugin) {
    return this.sendMessage("stopPlugin", plugin.toJSON())
  }
}

export namespace PluginWorker {
  export interface Props {
    parent: InstancePlugin
    baseDir: string
  }
}
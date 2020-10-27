import { Worker } from "worker_threads"
import path from "path"
import { LogMessage } from "@entity/LogMessage"
import { PluginManager } from "./PluginManager"
import { Plugin } from "./Plugin"
import { Messenger } from "../shared/messenger/Messenger"
import { State } from "../shared/state"
import { PluginQueue } from "./PluginQueue"

/**
 * Handles communication between worker and main thread
 */
export class PluginWorker {
  private worker: Worker|undefined
  private messenger: Messenger|undefined
  private parent: PluginManager
  private baseDir: string
  state: State = State.UNKNOWN

  constructor(props: PluginWorker.Props) {
    this.parent = props.parent
    this.baseDir = props.baseDir
  }

  /**
   * gets the instance which the worker is intended for
   */
  get instance() {
    return this.parent.parent
  }

  /** spawns the worker and loads all enabled plugins */
  async spawn() {
    await this.createWorker()
    const queue = new PluginQueue(await this.parent.getEnabledPlugins())
    while (true) {
      const plugin = queue.next()
      if (!plugin) break
      await plugin.start()
    }
    queue.missingDependencies().forEach(({ plugin, missing }) => {
      this.instance.log.warn(`refusing to load plugin ${plugin.name} because of missing dependencies: ${missing.join(", ")}`, LogMessage.Source.PLUGIN, plugin.name)
    })
  }

  /**
   * creates the worker and initiates the messenger
   */
  private createWorker() {
    return new Promise(async fulfill => {
      const worker = new Worker(path.join(__dirname, "../worker/worker.js"), { workerData: await this.getWorkerData() })
      this.worker = worker
      let messenger: Messenger
      worker.once("message", async msg => {
        if (msg !== State.INIT) throw new Error(`expected message to be "ready" received ${msg}`)
        messenger = await Messenger.create(p => worker.postMessage(p, [p]))
        this.messenger = messenger
        this.messenger.once("STATE", ({ message }) => {
          this.state = State.READY
          this.registerEvents()
          message.done()
          fulfill()
        })
        this.state = State.INIT
      })
      worker.on("online", () => this.instance.log.info(`Plugin worker started (instance ${this.instance.id})`))
      worker.on("error", err => this.instance.log.error(err))
      worker.on("exit", code => {
        this.instance.log.info(`worker exited with code ${code} (instance ${this.instance.id})`)
        worker.removeAllListeners()
        if (messenger) messenger.removeAllListeners()
      })
    })
  }

  /**
   * register events for various commands from the worker
   */
  private registerEvents() {
    if (!this.messenger) throw new Error(`no messenger has been registered`)
    this.messenger.on("GET_PLUGIN_CONFIG", async ({ message }) => {
      const plugin = await this.parent.getPluginById(message.data.id)
      if (!plugin) return message.except(`could not find plugin with id ${message.data.id}`)
      message.done(plugin.getConfig())
    })
    this.messenger.on("LOG_MESSAGE", async ({ message }) => {
      try {
        switch (message.data.level) {
          default:
          case "info":
            await this.instance.log.info(
              message.data.message,
              LogMessage.Source.PLUGIN,
              message.data.pluginName
            )
            break
          case "warn":
            await this.instance.log.warn(
              message.data.message,
              LogMessage.Source.PLUGIN,
              message.data.pluginName
            )
            break
          case "error":
            await this.instance.log.error(
              message.data.message,
              LogMessage.Source.PLUGIN,
              message.data.pluginName
            )
            break
        }
        message.done()
      } catch (e) {
        message.except(e.message)
      }
    })
  }

  /**
   * basic workerdata
   */
  private async getWorkerData() {
    const { host, port, password } = this.parent.parent.battlefield.options
    return {
      baseDir: this.baseDir,
      instanceId: this.instance.id,
      rcon: { host, port, password }
    }
  }

  /**
   * terminates the worker
   */
  stop() {
    if (!this.worker) return
    this.worker.terminate()
  }

  /**
   * restarts the worker
   */
  async restart() {
    this.stop()
    await this.spawn()
  }

  /**
   * sends a message to the worker
   * @param action action name to identify the intention
   * @param data data to send to the worker
   */
  private sendMessage(action: string, data: any) {
    if (!this.messenger) throw new Error("messenger not ready!")
    return this.messenger.send(action, data)
  }

  /**
   * sends a specific plugin which should be started to the worker
   * @param plugin plugin which should get started
   */
  async startPlugin(plugin: Plugin) {
    this.instance.log.info(`Starting plugin: ${plugin.name} (instance ${this.instance.id})`, LogMessage.Source.PLUGIN, plugin.name)
    await plugin.setAutostart(true)
    return this.sendMessage("startPlugin", await plugin.toJSON())
  }

  /**
   * stops a specific plugin
   * in order to stop a plugin the worker gets terminated and all plugins which should run get started
   * @param plugin plugin which should get stopped
   */
  async stopPlugin(plugin: Plugin) {
    await plugin.setAutostart(false)
    this.restart()
  }

  async executeRoute(props: PluginWorker.ExecuteRouteProps) {
    return this.sendMessage("executeRoute", props)
  }
}

export namespace PluginWorker {
  export interface Props {
    parent: PluginManager
    baseDir: string
  }

  export interface ExecuteRouteProps {
    method: string
    path: string
    plugin: string
    body: any
  }
}
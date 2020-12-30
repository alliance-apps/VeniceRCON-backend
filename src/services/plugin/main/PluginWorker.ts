import { Worker } from "worker_threads"
import path from "path"
import { LogMessage } from "@entity/LogMessage"
import { PluginManager } from "./PluginManager"
import { Plugin } from "./Plugin"
import { Messenger } from "../shared/messenger/Messenger"
import { PluginState, WorkerState } from "../shared/state"
import { PluginQueue } from "./PluginQueue"

/** handles communication between worker and main thread */
export class PluginWorker {

  static MONITORING_INTERVAL = 1000
  static MONITORING_TIMEOUT = 200
  static MONITORING_ALLOWED_FAILS = 5
  static MONITORING_MAX_RESTARTS = 2

  private worker: Worker|undefined
  private messenger: Messenger|undefined
  private parent: PluginManager
  private baseDir: string
  private queue: PluginQueue = new PluginQueue([])
  private monitoringInterval: any
  private monitoringMisses: number = 0
  private monitoringRestarts: number = 0
  state: WorkerState = WorkerState.STOP

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

  get isRunning() {
    return this.state === WorkerState.READY
  }

  get isStopped() {
    return this.state === WorkerState.STOP
  }

  private async initializeQueue() {
    this.queue = new PluginQueue(await this.parent.getEnabledPlugins())
  }

  /** spawns the worker and loads all enabled plugins */
  async spawn() {
    if (this.state !== WorkerState.STOP) return
    this.state = WorkerState.INIT
    await this.initializeQueue()
    if (!this.queue.hasPlugins) return this.state = WorkerState.STOP
    await this.createWorker()
    await this.startMonitoring()
    await this.startQueuedPlugins()
  }

  private startMonitoring() {
    this.stopMonitoring()
    this.monitoringInterval = setInterval(async () => {
      if (!this.messenger) {
        this.instance.log.warn(`monitoring received no messenger`)
        return this.monitoringMisses++
      }
      const timeout = new Promise(fulfill => setTimeout(fulfill, PluginWorker.MONITORING_TIMEOUT))
      const response = this.messenger.send("PING")
      if (await Promise.race([timeout, response]) === "PONG") {
        this.monitoringRestarts = 0
        if (this.monitoringMisses <= 0) return
        this.monitoringMisses--
      } else {
        this.monitoringMisses++
        this.instance.log.warn(`worker thread missed timeout ${this.monitoringMisses}/${PluginWorker.MONITORING_ALLOWED_FAILS}`)
      }
      if (this.monitoringMisses >= PluginWorker.MONITORING_ALLOWED_FAILS) {
        if (this.monitoringRestarts >= PluginWorker.MONITORING_MAX_RESTARTS) {
          this.instance.log.warn(`worker thread missed in time monitoring requests after ${this.monitoringRestarts} restarts... stopping...`)
          this.monitoringRestarts = 0
          this.stop()
        } else {
          this.instance.log.warn(`worker thread missed in time monitoring requests... restarting...`)
          this.monitoringRestarts++
          this.restart()
        }
      }
    }, PluginWorker.MONITORING_INTERVAL)
  }

  private stopMonitoring() {
    this.monitoringMisses = 0
    clearInterval(this.monitoringInterval)
  }

  /** starts all currently queued plugins */
  private async startQueuedPlugins() {
    while (true) {
      const plugin = this.queue.next()
      if (!plugin) break
      const state = await this.getPluginState(plugin)
      if (state === PluginState.RUNNING) continue
      try {
        await this.sendStartPlugin(plugin)
      } catch (e) {
        this.instance.log.error(e, LogMessage.Source.PLUGIN, plugin.name)
      }
    }
    this.queue.missingDependencies().forEach(({ plugin, missing }) => {
      this.instance.log.warn(`refusing to load plugin ${plugin.name} because of missing dependencies: ${missing.join(", ")}`, LogMessage.Source.PLUGIN, plugin.name)
    })
  }

  /**
   * creates the worker and initiates the messenger
   */
  private createWorker() {
    return new Promise<void>(async fulfill => {
      const worker = new Worker(path.join(__dirname, "../worker/worker.js"), { workerData: await this.getWorkerData() })
      this.worker = worker
      let messenger: Messenger
      worker.once("message", async msg => {
        if (msg !== WorkerState.INIT) throw new Error(`expected message to be "ready" received ${msg}`)
        messenger = await Messenger.create(p => worker.postMessage(p, [p]))
        this.messenger = messenger
        this.messenger.once("STATE", ({ message }) => {
          this.state = WorkerState.READY
          this.registerEvents()
          message.done()
          fulfill()
        })
        this.state = WorkerState.INIT
      })
      worker.on("online", () => this.instance.log.info(`Plugin worker started`))
      worker.on("error", err => this.instance.log.error(err))
      worker.on("exit", code => {
        this.state = WorkerState.STOP
        this.instance.log.info(`plugin worker exited with code ${code}`)
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
    this.messenger.on("REQUEST_PERMISSIONS", async ({ message }) => {
      const { guid } = message.data
      if (!guid) return message.except("no guid given")
      message.done(await this.instance.requestPermissionForGuid(guid))
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
    const { host, port, password } = this.instance.battlefield.options
    return {
      baseDir: this.baseDir,
      instanceId: this.instance.id,
      rcon: { host, port, password }
    }
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

  /** dispatches the plugin to the worker thread */
  private async sendStartPlugin(plugin: Plugin) {
    this.instance.log.info(`starting plugin`, LogMessage.Source.PLUGIN, plugin.name)
    plugin.state = Plugin.State.STARTED
    await this.sendMessage("startPlugin", await plugin.toJSON())
    this.instance.log.info(`plugin started`, LogMessage.Source.PLUGIN, plugin.name)
  }

  /** checks the queue and starts / stops the worker if needed */
  private async checkQueue() {
    if (!this.queue.hasPlugins) return
    if (this.state === WorkerState.STOP) return this.spawn()
    if (this.state === WorkerState.READY) return this.startQueuedPlugins()
  }

  /**
   * terminates the worker
   */
  stop() {
    if (!this.worker) return
    this.stopMonitoring()
    return this.worker.terminate()
  }

  /**
   * restarts the worker
   */
  async restart() {
    await this.stop()
    await this.spawn()
  }

  /**
   * sends a specific plugin which should be started to the worker
   * @param plugin plugin which should get started
   */
  async startPlugin(plugin: Plugin) {
    await plugin.setAutostart(true)
    this.queue.addPlugin(plugin)
    this.checkQueue()
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

  /** retrieves the current plugin state */
  async getPluginState(plugin: Plugin) {
    if (this.state === WorkerState.STOP) return PluginState.NOT_RUNNING
    if (!this.messenger) throw new Error("messenger not ready")
    return (
      (await this.messenger.send("pluginState", { id: plugin.id }))
        .state as PluginState
    )
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
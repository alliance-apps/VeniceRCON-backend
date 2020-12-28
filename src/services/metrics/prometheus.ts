import client from "prom-client"
import { config } from "@service/config"
import { instanceManager } from "../battlefield"
import { Instance } from "@service/battlefield/libs/Instance"

const prefix = "venicercon_"

client.register.setDefaultLabels({ host: config.metrics ? config.metrics.prometheus.instance : "default" })
client.collectDefaultMetrics({ prefix })

export const httpRequestDuration = new client.Histogram({
  name: `${prefix}http_request_duration`,
  help: "http request durations",
  labelNames: ["method", "url", "statusCode"]
})

export const instancePlayerOnlineStats = new client.Gauge({
  name: `${prefix}instance_active_players_count`,
  help: "active players on a specific instance",
  labelNames: ["id", "name", "version"],
  collect() {
    this.reset()
    const { CONNECTED } = Instance.State
    instanceManager.instances
      .filter(({ state }) => state.state.all().state === CONNECTED)
      .forEach(({ state }) => {
        const { id, name, version, serverinfo } = state.state.all()
        this.labels(String(id), name, version).set(serverinfo.slots || 0)
      })
  }
})

export const activeInstances = new client.Gauge({
  name: `${prefix}online_instances_count`,
  help: "online instances",
  labelNames: [],
  collect() {
    const { CONNECTED } = Instance.State
    this.set(instanceManager.instances.filter(({ state }) => {
      return state.state.all().state === CONNECTED
    }).length)
  }
})

export const inActiveInstances = new client.Gauge({
  name: `${prefix}offline_instances_count`,
  help: "offline",
  labelNames: [],
  collect() {
    const { CONNECTED } = Instance.State
    this.set(instanceManager.instances.filter(({ state }) => {
      return state.state.all().state !== CONNECTED
    }).length)
  }
})

export const exceptionsCounter = new client.Counter({
  name: `${prefix}exceptions_count`,
  help: "amount of unhandled exceptions happened",
  labelNames: ["type"]
})

export const metaData = new client.Gauge({
  name: `${prefix}build_info`,
  help: "build information about the current runtime",
  labelNames: ["package_version", "platform", "arch", "node_version"]
})


metaData.labels(config.packageInfo.version, process.platform, process.arch, process.version).set(Date.now())
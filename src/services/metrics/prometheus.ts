import client from "prom-client"
import { config } from "@service/config"
import { InstanceContainer } from "../container/InstanceContainer"
import { instanceManager } from "../battlefield"
import { Instance } from "@service/battlefield/libs/Instance"
import { server } from "../koa"

client.register.setDefaultLabels({ host: config.metrics ? config.metrics.prometheus.instance : "default" })
client.collectDefaultMetrics({
  prefix: "venicercon_"
})

export const httpRequestDuration = new client.Histogram({
  name: "venicercon_http_request_duration",
  help: "http request durations",
  labelNames: ["method", "url", "statusCode"]
})

export const instancePlayerOnlineStats = new client.Gauge({
  name: "venicercon_instance_active_players_count",
  help: "active players on a specific instance",
  labelNames: ["id", "name", "version"],
  collect() {
    this.reset()
    const { CONNECTED } = Instance.State
    instanceManager.instances
      .filter(({ state }) => state.get("state") === CONNECTED)
      .forEach(({ state }) => {
        const { id, name, version, serverinfo } = state.get()
        this.labels(String(id), name, version).set(serverinfo.slots || 0)
      })
  }
})

export const activeInstances = new client.Gauge({
  name: "venicercon_online_instances_count",
  help: "online instances",
  labelNames: [],
  collect() {
    const { CONNECTED } = Instance.State
    this.set(instanceManager.instances.filter(({ state }) => {
      return state.get("state") === CONNECTED
    }).length)
  }
})

export const inActiveInstances = new client.Gauge({
  name: "venicercon_offline_instances_count",
  help: "offline",
  labelNames: [],
  collect() {
    const { CONNECTED } = Instance.State
    this.set(instanceManager.instances.filter(({ state }) => {
      return state.get("state") !== CONNECTED
    }).length)
  }
})

export const exceptionsCounter = new client.Counter({
  name: "venicercon_exceptions_count",
  help: "amount of unhandled exceptions happened",
  labelNames: ["type"]
})
import client from "prom-client"
import { config } from "@service/config"
import { InstanceContainer } from "../container/InstanceContainer"

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
  labelNames: ["id", "name", "version"]
})

export const activeInstances = new client.Gauge({
  name: "venicercon_online_instances_count",
  help: "online instances",
  labelNames: []
})

export const inActiveInstances = new client.Gauge({
  name: "venicercon_offline_instances_count",
  help: "offline",
  labelNames: []
})

export const exceptionsCounter = new client.Counter({
  name: "venicercon_exceptions_count",
  help: "amount of unhandled exceptions happened",
  labelNames: ["type"]
})

/** adds an instance from metrics collection */
export function addServerMetrics(state: InstanceContainer) {
  inActiveInstances.inc()
  updateServerMetrics(state)
}

/** removes an instance from metrics collection */
export function removeServerMetrics(state: InstanceContainer) {
  inActiveInstances.dec()
  removeInstancePlayerStatsLabel(state)
}

/** sets metrics from an instance to connected state */
export function connectServerMetrics(state: InstanceContainer) {
  inActiveInstances.dec()
  activeInstances.inc()
}

/** sets metrics from an instance to disconnected state */
export function disconnectServerMetrics(state: InstanceContainer) {
  inActiveInstances.inc()
  activeInstances.dec()
  removeInstancePlayerStatsLabel(state)
}

/** updates the server metrics with its state */
export function updateServerMetrics(state: InstanceContainer) {
  removeInstancePlayerStatsLabel(state)
  instancePlayerOnlineStats
    .labels(String(state.get("id")), state.get("name"), state.get("version"))
    .set(state.get("serverinfo").slots || 0)
}

/** removes instance player online stats metrics */
function removeInstancePlayerStatsLabel(state: InstanceContainer) {
  instancePlayerOnlineStats.remove(String(state.get("id")))
}
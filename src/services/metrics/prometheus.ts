import client from "prom-client"
import { config } from "@service/config"

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
  labelNames: ["id", "name"]
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
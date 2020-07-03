import { workerData, isMainThread, parentPort, MessagePort } from "worker_threads"
import { Messenger } from "../shared/messenger/Messenger"
import "../../../util/winston"
import winston from "winston"
import { PluginHandler } from "./PluginHandler"

if (isMainThread) throw new Error("worker can not be main thread")
if (!parentPort) throw new Error("did not receive any message parentPort")
if (typeof workerData.baseDir !== "string") throw new Error("baseDir not set to plugin folder")

//time till the messenger should have sent the message port
const timeout = setTimeout(() => {
  winston.error("did not receive any message port! exiting!")
  process.exit(1)
}, 2000)

parentPort.once("message", async port => {
  if (!(port instanceof MessagePort)) throw new Error(`expected MessagePort but got ${port}`)
  clearTimeout(timeout)
  const handler = new PluginHandler({
    messenger: new Messenger({ port }),
    basePath: workerData.baseDir
  })
})
parentPort.postMessage("ready")
import { workerData, isMainThread, parentPort, MessagePort } from "worker_threads"
import { Messenger } from "../shared/messenger/Messenger"
import "../../../util/winston"
import winston from "winston"
import { PluginHandler } from "./PluginHandler"
import { State } from "../shared/state"
//import "./console"

if (isMainThread) throw new Error("worker can not be main thread")
if (!parentPort) throw new Error("did not receive any message parentPort")
if (typeof workerData.baseDir !== "string") throw new Error("baseDir not set to plugin folder")
if (typeof workerData.instanceId !== "number") throw new Error("instanceId not set")
if (typeof workerData.rcon !== "object") throw new Error("rcon options not set")

//time till the messenger should have sent the message port
const timeout = setTimeout(() => {
  winston.error("did not receive any message port! exiting!")
  process.exit(1)
}, 2000)

parentPort.once("message", async port => {
  if (!(port instanceof MessagePort)) throw new Error(`expected MessagePort but got ${port}`)
  clearTimeout(timeout)
  //@ts-ignore
  const handler = new PluginHandler({
    messenger: new Messenger({ port }),
    basePath: workerData.baseDir,
    instanceId: workerData.instanceId,
    rcon: workerData.rcon
  })
})
parentPort.postMessage(State.INIT)
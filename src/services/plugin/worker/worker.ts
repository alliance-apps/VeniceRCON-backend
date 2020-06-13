import { workerData, isMainThread, parentPort, MessagePort } from "worker_threads"
import { Messenger } from "../shared/Messenger"

if (isMainThread) throw new Error("worker can not be main thread")
if (!parentPort) throw new Error("did not receive any message parentPort")
if (typeof workerData.baseDir !== "string") throw new Error("baseDir not set to plugins")

//time till the messenger should have sent the message port
const timeout = setTimeout(() => {
  console.log("did not receive any message port! exiting!")
  process.exit(1)
}, 1000)

parentPort.once("message", port => {
  if (!(port instanceof MessagePort)) throw new Error(`expected MessagePort but got ${port}`)
  clearTimeout(timeout)
  const messenger = new Messenger({ port })
  messenger.on("message", ({ message }) => {
    message.done()
  })
})
parentPort.postMessage("ready")
import { workerData, isMainThread } from"worker_threads"

if (isMainThread) throw new Error("worker can not be main thread")
if (typeof workerData.path !== "string") throw new Error("path not set to plugin")
console.log("worker hello :)")
require(workerData.path)
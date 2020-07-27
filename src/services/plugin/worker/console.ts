import winston from "winston"
import chalk from "chalk"
import { workerData } from "worker_threads"
import { Console } from "console"

const format = (level: "warn"|"error"|"verbose"|"info", data: any[]) => {
  const serialized = data.map(d => JSON.stringify(d, null, 2)).join(", ")
  winston.log({
    level,
    message: `${chalk.blueBright.bold(workerData.instanceId)} ${serialized}`
  })
}

global.console = {
  ...(new Console({
    stdout: process.stdout,
    stderr: process.stderr
  })),
  info: (...args: any[]) => format("info", args),
  log: (...args: any[]) => format("info", args),
  error: (...args: any[]) => format("error", args),
  debug: (...args: any[]) => format("verbose", args),
  warn: (...args: any[]) => format("warn", args)
}

setTimeout(() => {
  winston.info("going to log")
  console.log("foo")
}, 1000)
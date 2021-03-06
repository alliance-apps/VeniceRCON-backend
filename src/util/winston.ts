import winston, { format, transports } from "winston"
import chalk from "chalk"

export const errorLog = format(info => {
  if (info instanceof Error) info.error = info
  if (info.stack) {
    info.error = new Error(info.message)
    info.error.stack = info.stack
  }
  return info
})

export const prettyLog = format(info => {
  const messages: string[] = []
  let meta = ""
  if (info.message !== undefined) messages.push(info.message)

  if (info.meta && Object.keys(info.meta).length) {
    meta = "\n\t" + JSON.stringify(info.meta)
  }

  const level = (() => {
    const level = info.level ? info.level.toUpperCase() : "WARN"
    switch (level) {
      case "VERBOSE": return chalk.grey.bold(level)
      case "INFO": return chalk.cyan.bold(level)
      case "WARN": return chalk.yellow.bold(level)
      case "ERROR": return chalk.red.inverse.bold(level)
      default: return level
    }
  })()

  if (info.error instanceof Error) {
    if (info.error.stack) {
      messages.push(info.error.stack)
    } else {
      messages.push(info.error.message)
    }
  }

  info.message = [`${chalk.dim(info.timestamp)} ${level}`, messages.join(" "), meta].join(" ")
  return info
})

const consoleTransport = new transports.Console({
  level: "info",
  format: format.combine(
    format.timestamp({format: "DD.MM.YYYY HH:mm:ss.SSS"}),
    prettyLog(),
    format.printf(opts => opts.message)
  )
})

export function updateLogLevel(level: "verbose"|"info"|"warn"|"error") {
  consoleTransport.level = level
}

winston.configure({
  format: format.combine(
    errorLog()
  ),
  transports: [consoleTransport]
})
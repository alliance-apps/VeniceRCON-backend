import winston, { format, transports } from "winston"
import chalk from "chalk"

const prettyLog = format(opts => {
  let message = ""
  let meta = ""
  if (opts.message !== undefined) message = opts.message

  if (opts.meta && Object.keys(opts.meta).length) {
    meta = "\n\t" + JSON.stringify(opts.meta)
  }

  const level = (() => {
    const level = opts.level.toUpperCase()
    switch (level) {
      case "VERBOSE": return chalk.grey.bold(level)
      case "INFO": return chalk.cyan.bold(level)
      case "WARN": return chalk.yellow.bold(level)
      case "ERROR": return chalk.red.inverse.bold(level)
      default: return level
    }
  })()

  opts.message = [`${chalk.dim(opts.timestamp)} ${level}`, message, meta].join(" ")
  return opts
})

winston.configure({
  transports: [
    new transports.Console({
      level: "verbose",
      format: format.combine(
        format.timestamp({format: "DD.MM.YYYY HH:mm:ss.SSS"}),
        prettyLog(),
        format.printf(opts => opts.message)
      )
    })
  ]
})
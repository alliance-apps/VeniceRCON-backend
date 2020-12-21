import winston from "winston"
import { register } from "tsconfig-paths"

const cleanup = register({
  baseUrl: __dirname.endsWith("src") ? "./src" : __dirname,
  paths: {
    "@entity/*": ["services/orm/entity/*"],
    "@repository/*": ["services/orm/repository/*"],
    "@service/*": ["services/*"]
  }
})

process.on("uncaughtException", error => {
  winston.error("uncaught exception")
  winston.error(error)
})

process.on("unhandledRejection", error => {
  winston.error("unhandled Promise rejection")
  winston.error(error)
})

;(async () => {

  //check arguments
  const args: Record<string, string> = {}
  process.argv.slice(2).forEach(arg => {
    const [key, ...values] = arg.split("=")
    args[key] = values.join("=")
  })

  //initialize application
  require("./util/winston")
  winston.info("initializing config...")
  await require("@service/config").initialize(args)
  winston.info("initializing database...")
  await require("@service/orm").connect(args)
  winston.info("initializing koa webserver...")
  const postInitKoa = await require("@service/koa").initialize(args)
  winston.info("initializing plugin manager...")
  await require("@service/plugin").initialize(args)
  winston.info("initializing instance manager...")
  await require("@service/battlefield").initialize(args)
  winston.info("start listen for webserver...")
  await postInitKoa()
  winston.info("initialization done!")
  cleanup()
})()


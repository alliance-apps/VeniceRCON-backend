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

;(async () => {
  require("./util/winston")
  winston.info("initializing config...")
  await require("@service/config").initialize()
  winston.info("initializing database...")
  await require("@service/orm").connect()
  winston.info("initializing koa webserver...")
  const postInitKoa = await require("@service/koa").initialize()
  winston.info("initializing plugin manager...")
  await require("@service/plugin").initialize()
  winston.info("initializing instance manager...")
  await require("@service/battlefield").initialize()
  winston.info("start listen for webserver...")
  await postInitKoa()
  winston.info("initialization done!")
  cleanup()
})()
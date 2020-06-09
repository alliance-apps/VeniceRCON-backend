import winston from "winston"

(async () => {
  require("./util/winston")
  winston.info("initializing config...")
  await require("@service/config").initialize()
  winston.info("initializing database...")
  await require("@service/orm").connect()
  winston.info("initializing koa webserver...")
  await require("@service/koa").initialize()
  winston.info("initializing plugin manager...")
  await require("@service/plugin").initialize()
  winston.info("initializing instance manager...")
  await require("@service/battlefield").initialize()
  winston.info("initialization done!")
})()
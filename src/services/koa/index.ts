import Koa, { Context } from "koa"
import koaSend from "koa-send"
import Router from "koa-joi-router"
import { createServer } from "http"
import { createRoute as createApiRoute } from "./api"
import { initialize as initSocket } from "../koa/socket"
import { config } from "@service/config"
import path from "path"
import { Server } from "socket.io"
import winston from "winston"
import chalk from "chalk"
import { randomBytes } from "crypto"

export const app = new Koa()
export const server = createServer(app.callback())
export let io: Server = new Server(server, {
  cors: {
    origin: config.webserver.cors,
    methods: ["GET", "POST"],
    credentials: true
  }
})

export async function initialize() {

  const router = Router()

  app.proxy = config.webserver.proxy

  app.use(async (ctx, next) => {
    try {
      applyCors(ctx)
      if (ctx.status === 204) return
      await next()
    } catch (error) {
      applyCors(ctx)
      //handle schema validation errors
      if (error.isJoi) {
        ctx.status = error.status
        ctx.body = { message: error.message, validationError: true, details: error.details }
      } else {
        const guid = randomBytes(16).toString("hex")
        ctx.status = 500
        //display more informations on rcon command failures
        if (error.isVuRconError) {
          ctx.body = { message: `rcon command failed "${error.message}", error guid: "${guid}"` }
        //display a general error message if from unknown source
        } else {
          ctx.body = { message: `something went wrong, error guid: "${guid}"` }
        }
        winston.error(`${chalk.bold(chalk.cyan(guid))} unhandled HTTP API error on request ${ctx.method} ${ctx.url}`)
        winston.error(`${chalk.bold(chalk.cyan(guid))} ${error.message}`)
        winston.error(`${chalk.bold(chalk.cyan(guid))} ${error.stack}`)
      }
    }
  })

  router.use("/api", (await createApiRoute()).middleware())
  await initSocket(io)

  app.use(router.middleware())

  app.use(async ctx => {
    if (ctx.path.startsWith("/api")) return ctx.status = 404
    await koaSend(
      ctx, ctx.path, {
        root: path.join(__dirname, "/../../../public/"),
        index: "index.html"
      }
    )
  })

  //post init
  return () => {
    return new Promise<void>(fulfill => {
      server.listen(config.webserver.listenport, () => {
        winston.info(`webserver listening on ${chalk.bold(config.webserver.listenport)}`)
        fulfill()
      })
    })
  }

}

//add cors headers if set in config
export function applyCors(ctx: Context) {
  const { cors } = config.webserver
  const { origin } = ctx.headers
  if (!cors.includes(origin)) return
  ctx.set("Access-Control-Allow-Credentials", "true")
  ctx.set("Access-Control-Allow-Origin", origin)
  ctx.set("Access-Control-Allow-Methods", ["GET", "HEAD", "OPTIONS", "POST", "PATCH", "DELETE"].join(","))
  ctx.set("Access-Control-Allow-Headers", ["Authorization", "Content-Type"].join(","))
  if (["HEAD", "OPTIONS"].includes(ctx.method.toUpperCase())) ctx.status = 204
}
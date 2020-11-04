import Koa, { Context } from "koa"
import koaSend from "koa-send"
import Router from "koa-joi-router"
import { createServer } from "http"
import { createRoute as createApiRoute } from "./api"
import { initialize as initSocket } from "../koa/socket"
import { config } from "@service/config"
import path from "path"
import socketIO from "socket.io"
import winston from "winston"
import chalk from "chalk"

export const app = new Koa()
export const server = createServer(app.callback())
export const io = socketIO(server)

export async function initialize() {

  const router = Router()

  app.use(async (ctx, next) => {
    try {
      applyCors(ctx)
      if (ctx.status === 204) return
      await next()
    } catch (error) {
      if (error.isJoi) {
        applyCors(ctx)
        ctx.status = error.status
        ctx.body = { message: error.message, validationError: true, details: error.details }
      } else {
        throw error
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
    return new Promise(fulfill => {
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
  const { host, origin } = ctx.request
  if (!cors.includes(host)) return
  ctx.set("Access-Control-Allow-Credentials", "true")
  ctx.set("Access-Control-Allow-Origin", origin)
  ctx.set("Access-Control-Allow-Methods", ["GET", "HEAD", "OPTIONS", "POST", "PATCH", "DELETE"].join(","))
  ctx.set("Access-Control-Allow-Headers", ["Authorization", "Content-Type"].join(","))
}
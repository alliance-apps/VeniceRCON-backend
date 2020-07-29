import Koa from "koa"
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

  if (config.development) {

    app.use(async (ctx, next) => {
      const { cors } = config.webserver
      Object.keys(cors).forEach(k => ctx.set(k, cors[k]))
      //firefox
      if (ctx.request.method.toUpperCase() === "OPTIONS") return ctx.status = 200
      await next()
    })

  }

  router.use("/api", (await createApiRoute()).middleware())
  await initSocket(io)

  app.use(router.middleware())

  app.use(async ctx => {
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
import Koa from "koa"
import { createServer } from "http"
import apiRouter from "./api"
import Router from "koa-joi-router"
import { initialize as initSocket } from "../koa/socket"

export const app = new Koa()
export const server = createServer(app.callback())
export const io = require("socket.io")(server)

export async function initialize() {

  const router = Router()

  router.use("/api", apiRouter.middleware())
  await initSocket(io)

  app.use(router.middleware())

  const listenPort = parseInt(process.env.LISTENPORT||"") || 8000
  server.listen(listenPort, () => {
    console.log(`webserver listening on ${listenPort}`)
  })

}
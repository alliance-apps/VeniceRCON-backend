import Koa from "koa"
import { createServer } from "http"
import apiRouter from "./api"
import Router from "koa-joi-router"
import { initialize as initSocket } from "../koa/socket"
import { config } from "@service/config"
import swagger from "koa2-swagger-ui"
import yaml from "yaml"
import { promises as fs } from "fs"

export const app = new Koa()
export const server = createServer(app.callback())
export const io = require("socket.io")(server)

export async function initialize() {

  const router = Router()

  const content = await fs.readFile(`${__dirname}/swagger/meta.yaml`, "utf-8")
 
  if (config.development) {
    router.use(swagger())
    router.get("/swagger", swagger({
      routePrefix: false,
      hideTopbar: true,
      swaggerOptions: {
        spec: yaml.parse(content)
      }
    }))
  }
  
  router.use("/api", apiRouter.middleware())
  await initSocket(io)

  app.use(router.middleware())

  server.listen(config.webserver.listenport, () => {
    console.log(`webserver listening on ${config.webserver.listenport}`)
  })

}
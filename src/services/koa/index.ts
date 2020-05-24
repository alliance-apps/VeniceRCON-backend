import Koa from "koa"
import koaSend from "koa-send"
import Router from "koa-joi-router"
import swagger from "koa2-swagger-ui"
import { createServer } from "http"
import { createRoute as createApiRoute } from "./api"
import { initialize as initSocket } from "../koa/socket"
import { config } from "@service/config"
import { promises as fs } from "fs"
import path from "path"

export const app = new Koa()
export const server = createServer(app.callback())
export const io = require("socket.io")(server)

export async function initialize() {

  const router = Router()
 
  if (config.development) {
    
    app.use(async (ctx, next) => {
      ctx.set("Access-Control-Allow-Credentials", "true")
      ctx.set("Access-Control-Allow-Origin", "*")
      ctx.set("Access-Control-Allow-Headers", ["Authorization"])
      //firefox
      if (ctx.request.method.toUpperCase() === "OPTIONS") return ctx.status = 200
      await next()
    })

    console.log("serve swagger")
    router.get("/swagger/(.*)", ctx => koaSend(ctx, ctx.path, { root: `${__dirname}` }))

    router.use(swagger())
    const content = await fs.readFile(`${__dirname}/swagger/meta.yaml`, "utf-8")

    router.get("/swagger", swagger({
      routePrefix: false,
      hideTopbar: true,
      swaggerOptions: {
        url: "/swagger/meta.yaml"
      }
    }))

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

  server.listen(config.webserver.listenport, () => {
    console.log(`webserver listening on ${config.webserver.listenport}`)
  })

}
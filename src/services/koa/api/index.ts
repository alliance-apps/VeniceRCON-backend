import Router from "koa-joi-router"
import json from "koa-json"
import bodyParser from "koa-bodyparser"
import authRouter from "./auth"
import instanceRouter from "./instances"
import pluginRouter from "./plugins"
import repositoryRouter from "./repository"
import { config } from "@service/config"
import { jwtMiddleware } from "../jwt"
import { PluginRepositoryScope } from "@service/permissions/Scopes"
import { perm } from "../permission"
import { isEnabled } from "@service/mail"

export async function createRoute() {
  const router = Router()

  router.use(bodyParser({
    enableTypes: ["json"],
    onerror: (err, ctx) => ctx.throw("body parse error", 422)
  }))

  router.get("/", ctx => {
    const features = []
    if (isEnabled()) features.push("forgot-password")
    ctx.body = { name: "VeniceRCON-api", features }
    ctx.status = 200
  })

  router.use(json({ pretty: config.webserver.prettyJson }))

  router.use(await jwtMiddleware({ passthrough: true }))

  router.use("/auth", authRouter.middleware())
  router.use("/plugins", pluginRouter.middleware())
  router.use(await jwtMiddleware())
  router.use("/instances", instanceRouter.middleware())
  router.use(
    "/repository",
    perm(PluginRepositoryScope.ACCESS),
    repositoryRouter.middleware()
  )

  return router
}
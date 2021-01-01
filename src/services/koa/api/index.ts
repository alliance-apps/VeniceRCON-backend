import Router from "koa-joi-router"
import json from "koa-json"
import bodyParser from "koa-bodyparser"
import authRouter from "./auth"
import instanceRouter from "./instances"
import pluginRouter from "./plugins"
import repositoryRouter from "./repository"
import userRouter from "./user"
import { config } from "@service/config"
import { jwtMiddleware } from "../jwt"
import { PluginRepositoryScope, UserScope } from "@service/permissions/Scopes"
import { perm } from "../permission"
import { isEnabled } from "@service/mail"
import auth from "koa-basic-auth"
import client from "prom-client"
import { httpRequestCounter } from "@service/metrics/prometheus"

export async function createRoute() {
  const router = Router()

  //prometheus metrics collection
  if (config.metrics && config.metrics.prometheus.enable) {
    router.use(async (ctx, next) => {
      try {
        await next()
        httpRequestCounter.labels(ctx.method.toUpperCase(), ctx.url, String(ctx.status)).inc()
      } catch (e) {
        httpRequestCounter.labels(ctx.method.toUpperCase(), ctx.url, String(ctx.status)).inc()
        throw e
      }
    })
    router.get(
      "/metrics",
      auth(config.metrics.prometheus.basicauth),
      async ctx => {
        ctx.body = await client.register.metrics()
      })
  }

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
  router.use("/repository", perm(PluginRepositoryScope.ACCESS), repositoryRouter.middleware())
  router.use("/users", perm(UserScope.ACCESS), userRouter.middleware())

  return router
}
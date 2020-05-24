import Router from "koa-joi-router"
import json from "koa-json"
import bodyParser from "koa-bodyparser"
import authRouter from "./auth"
import instanceRouter from "./instances"
import { config } from "@service/config"
import { jwtMiddleware } from "../jwt"

export async function createRoute() {
  const router = Router()

  router.use(bodyParser({
    enableTypes: ["json"],
    onerror: (err, ctx) => ctx.throw("body parse error", 422)
  }))
  router.use(json({ pretty: config.development }))
  
  router.use(await jwtMiddleware({ passthrough: true }))
  
  router.use("/auth", authRouter.middleware())
  router.use("/instances", await jwtMiddleware(), instanceRouter.middleware())
  
  return router
}
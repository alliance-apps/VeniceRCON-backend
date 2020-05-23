import Router from "koa-joi-router"
import bodyParser from "koa-bodyparser"
import authRouter from "./auth"
import instanceRouter from "./instances"
import json from "koa-json"
import { config } from "@service/config"
import { jwt } from "../permission"
import { stateDefaults } from "./state"

const router = Router()

router.use(bodyParser({
  enableTypes: ["json"],
  onerror: (err, ctx) => ctx.throw("body parse error", 422)
}))
router.use(json({ pretty: config.development }))

router.use(jwt({ passthrough: true }))
router.use(stateDefaults)

router.use("/auth", authRouter.middleware())
router.use("/instances", jwt(), instanceRouter.middleware())

export default router
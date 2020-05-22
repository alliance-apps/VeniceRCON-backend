import Router from "koa-joi-router"
import bodyParser from "koa-bodyparser"
import authRouter from "./auth"
import json from "koa-json"

const router = Router()

router.use(bodyParser({
  enableTypes: ["json"],
  onerror: (err, ctx) => ctx.throw("body parse error", 422)
}))
router.use(json({ pretty: Boolean(process.env.DEVELOPMENT) }))

router.use("/auth", authRouter.middleware())

export default router
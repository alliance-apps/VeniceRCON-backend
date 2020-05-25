import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import { perm } from "@service/koa/permission"
import userRouter from "./users"
import { InstanceScope, InstanceUserScope } from "@service/permissions/Scopes"

const api = Router()

api.delete("/", perm(InstanceScope.DELETE), async ctx => {
  try {
    await instanceManager.removeInstance(ctx.state.instance!.container.id)
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.container.getStateClone()
})

api.patch("/start", perm(InstanceScope.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.start()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.patch("/stop", perm(InstanceScope.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.stop()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.use("/users", perm(InstanceUserScope.ACCESS), userRouter.middleware())

export default api
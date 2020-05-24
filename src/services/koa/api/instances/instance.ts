import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import { perm } from "@service/koa/permission"
import { Permission } from "@entity/Permission"
import userRouter from "./users"

const api = Router()

api.delete("/", perm(Permission.Instance.DELETE), async ctx => {
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

api.patch("/start", perm(Permission.Instance.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.start()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.patch("/stop", perm(Permission.Instance.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.stop()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.use("/users", perm(Permission.InstanceUser.ACCESS), userRouter.middleware())

export default api
import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import instanceRouter from "./instance"

const api = Router()

api.param("instanceId", async (id, ctx, next) => {
  const instanceId = parseInt(id, 10)
  if (isNaN(instanceId) || instanceId <= 0) {
    ctx.body = { message: "invalid instanceId provided, expected positive number" }
    return ctx.status = 400
  }
  const instance = instanceManager.getInstanceById(instanceId)
  if (!instance) return ctx.status = 404
  if (!instance.plugin.isRunning) return ctx.status = 503
  ctx.state.instance = instance
  await next()
})

api.use("/:instanceId", instanceRouter.middleware())


export default api
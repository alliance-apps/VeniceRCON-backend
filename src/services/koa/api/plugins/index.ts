import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import instanceRouter from "./instance"

const api = Router()

api.param("instanceId", async (id, ctx, next) => {
  if (isNaN(parseInt(id, 10))) return ctx.status = 400
  const instance = instanceManager.getInstanceById(parseInt(id, 10))
  if (!instance) return ctx.status = 404
  ctx.state.instance = instance
  await next()
})

api.use("/:instanceId", instanceRouter.middleware())


export default api
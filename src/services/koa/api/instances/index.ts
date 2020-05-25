import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import instanceRouter from "./instance"
import { getContainerState } from "@service/container"
import { perm } from "@service/koa/permission"
import { InstanceScope } from "@service/permissions/Scopes"

const { Joi } = Router
const api = Router()

api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      host: Joi.string(),
      port: Joi.number().min(1024).max(65536),
      password: Joi.string()
    })
  },
  pre: perm(InstanceScope.CREATE),
  handler: async ctx => {
    try {
      const instance = await instanceManager.addInstance({
        host: ctx.request.body.host,
        port: ctx.request.body.port,
        password: ctx.request.body.password
      })
      ctx.status = 200
      ctx.body = { id: instance.container }
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

api.get("/", async ctx => {
  ctx.body = await getContainerState("instance", ctx.state.token!.id)
})

api.param("instanceId", async (id, ctx, next) => {
  const instance = instanceManager.getInstanceById(parseInt(id))
  if (!instance) return ctx.status = 404
  ctx.state.instance = instance
  await next()
})

api.use("/:instanceId", perm(InstanceScope.ACCESS), instanceRouter.middleware())

export default api
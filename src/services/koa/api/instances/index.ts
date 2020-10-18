import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import instanceRouter from "./instance"
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
      test: Joi.boolean().optional().default(false),
      host: Joi.string().required(),
      port: Joi.number().min(1024).max(65536).required(),
      password: Joi.string().required()
    }).required()
  },
  pre: perm(InstanceScope.CREATE),
  handler: async ctx => {
    try {
      if (ctx.request.body.test) {
        await instanceManager.testInstance({
          host: ctx.request.body.host,
          port: ctx.request.body.port,
          password: ctx.request.body.password
        })
        ctx.status = 200
      } else {
          const instance = await instanceManager.createInstance({
            host: ctx.request.body.host,
            port: ctx.request.body.port,
            password: ctx.request.body.password
          })
          ctx.status = 200
          ctx.body = instance.state.get()
      }
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

api.get("/", async ctx => {
  const instances = await instanceManager.getInstancesWithPermissions(
    ctx.state.token!.id,
    InstanceScope.ACCESS
  )
  ctx.body = instances.map(instance => instance.state.get())
})

api.param("instanceId", async (id, ctx, next) => {
  if (isNaN(parseInt(id, 10))) return ctx.status = 400
  const instance = instanceManager.getInstanceById(parseInt(id, 10))
  if (!instance) return ctx.status = 404
  ctx.state.instance = instance
  await next()
})

api.use("/:instanceId", perm(InstanceScope.ACCESS), instanceRouter.middleware())

export default api
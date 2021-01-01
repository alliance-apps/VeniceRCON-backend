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
    const { test, ...props } = ctx.request.body
    if (instanceManager.hostAlreadyUsed(props.host, props.port)) {
      ctx.body = { message: `${props.host}:${props.port} already exists` }
      return ctx.status = 400
    }
    if (test) {
      try {
        await instanceManager.testInstance(props)
        return ctx.status = 200
      } catch (e) {
        ctx.body = { message: `test failed: ${e.message}` }
        return ctx.status = 500
      }
    }
    try {
      const instance = await instanceManager.createInstance(props)
      await instance.ready
      ctx.body = instance.state.get()
    } catch (e) {
      ctx.status = 400
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
  const instanceId = parseInt(id, 10)
  if (isNaN(instanceId) || instanceId <= 0) {
    ctx.body = { message: "Invalid instanceId provided! expected positive number!" }
    return ctx.status = 400
  }
  try {
    const instance = instanceManager.getInstanceById(parseInt(id, 10))
    ctx.state.instance = instance
    await next()
  } catch (e) {
    if (e.message.startsWith("could not find instance")) return ctx.status = 404
    throw e
  }
})

api.use("/:instanceId", perm(InstanceScope.ACCESS), instanceRouter.middleware())

export default api
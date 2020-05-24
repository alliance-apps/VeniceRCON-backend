import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import instanceRouter from "./instance"
import { getContainerState } from "@service/container"
import { perm } from "@service/koa/permission"
import { Permission } from "@entity/Permission"


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
  pre: perm(Permission.Instance.CREATE),
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
  let isRoot = false
  const instances = (await ctx.state.getUserPermissions()).map(p => {
    if (!p.hasPermission(Permission.Instance.ACCESS)) return 0
    if (p.root) return (isRoot = true, 0)
    return p.instance
  })
  const states = getContainerState("Instance")
  if (isRoot) return ctx.body = states
  ctx.body = states.filter(state => instances.includes(state.id))
})

api.param("id", async (id, ctx, next) => {
  const instance = instanceManager.getInstanceById(parseInt(id))
  if (!instance) return ctx.status = 404
  ctx.state.instance = instance
  await next()
})

api.use("/:id", perm(Permission.Instance.ACCESS), instanceRouter.middleware())

export default api
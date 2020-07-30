import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { PluginScope } from "@service/permissions/Scopes"
import { Instance } from "@service/battlefield/libs/Instance"
import pluginRouter from "./plugin"

const api = Router()
const { Joi } = Router

//lists currently used plugins
api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.plugin.created().map(p => p.toJSON())
})

//lists all available plugins for this instance
api.get("/available", async ctx => {
  ctx.body = ctx.state.instance!.plugin.available()
    .map(plugin => ({ ...plugin.meta, identifier: plugin.id }))
})

api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({ identifier: Joi.string() })
  },
  pre: perm(PluginScope.MODIFY),
  handler: async ctx => {
    const { identifier } = ctx.request.body
    try {
      const plugin = await ctx.state.instance!.plugin.create(identifier)
      ctx.body = { id: plugin.id }
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

api.param("pluginId", async (pluginId, ctx, next) => {
  const instance: Instance = ctx.state.instance!
  const plugin = instance.plugin.findId(parseInt(pluginId, 10))
  if (!plugin) return ctx.status = 404
  ctx.state.plugin = plugin
  await next()
})

api.use("/:pluginId", pluginRouter.middleware())


export default api
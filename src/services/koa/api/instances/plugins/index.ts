import Router from "koa-joi-router"
import { pluginManager } from "@service/plugin"
import { perm } from "@service/koa/permission"
import { PluginScope } from "@service/permissions/Scopes"
import { Instance } from "@service/battlefield/Instance"
import pluginRouter from "./plugin"

const api = Router()
const { Joi } = Router

//lists currently used plugins
api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.plugins.map(p => p.toJSON())
})

//lists all available plugins for this instance
api.get("/available", async ctx => {
  ctx.body = pluginManager
    .getPlugins(ctx.state.instance!.getState().version)
    .map(plugin => ({
      ...plugin.meta,
      identifier: plugin.id
    }))
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
    const bp = pluginManager.getBlueprint(identifier, ctx.state.instance!.getState().version)
    if (!bp) return ctx.status = 404
    const plugin = await bp.createInstance(ctx.state.instance!)
    ctx.body = { id: plugin.id }
  }
})

api.param("pluginId", async (pluginId, ctx, next) => {
  const instance: Instance = ctx.state.instance!
  const plugin = instance.getPlugin(parseInt(pluginId, 10))
  if (!plugin) return ctx.status = 404
  ctx.state.plugin = plugin
  await next()
})

api.use("/:pluginId", pluginRouter.middleware())


export default api
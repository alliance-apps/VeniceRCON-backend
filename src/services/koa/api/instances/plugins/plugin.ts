import Router from "koa-joi-router"
import { PluginScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"
import { checkVariableSchema } from "@service/plugin/schema"

const api = Router()

api.get("/", async ctx => {
  ctx.body = ctx.state.plugin!.toJSON()
})

api.delete("/", perm(PluginScope.REMOVE), async ctx => {
  await ctx.state.plugin!.remove()
  ctx.status = 200
})


api.route({
  method: "PATCH",
  path: "/config",
  pre: perm(PluginScope.MODIFY),
  handler: async ctx => {
    const plugin = await ctx.state.plugin!
    if (!plugin.meta.vars)  {
      ctx.body = { message: "script has no configuration" }
      return ctx.status = 400
    }
    try {
      const validated = await checkVariableSchema(plugin.meta.vars, ctx.request.body)
      await plugin.updateConfig(validated)
      ctx.status = 200
    } catch (e) {
      ctx.status = 400
      ctx.body = { message: e.message }
    }
  }
})

api.route({
  method: "POST",
  path: "/start",
  pre: perm(PluginScope.MODIFY),
  handler: async ctx => {
    await ctx.state.plugin!.start()
    ctx.status = 200
  }
})

api.route({
  method: "POST",
  path: "/stop",
  pre: perm(PluginScope.MODIFY),
  handler: async ctx => {
    await ctx.state.plugin!.stop()
    ctx.status = 200
  }
})

export default api
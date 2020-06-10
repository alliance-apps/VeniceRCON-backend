import Router from "koa-joi-router"
import { PluginScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.plugin!.toJSON()
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
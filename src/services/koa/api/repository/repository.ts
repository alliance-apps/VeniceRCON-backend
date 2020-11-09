import { perm } from "@service/koa/permission"
import { PluginRepositoryScope } from "@service/permissions/Scopes"
import { pluginStore } from "@service/plugin"
import Router from "koa-joi-router"


const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.repository!.toJSON()
})

api.delete("/", perm(PluginRepositoryScope.REMOVE), async ctx => {
  await ctx.state.repository!.entity.remove()
  await pluginStore.reload()
  ctx.status = 200
})


api.route({
  method: "PATCH",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      url: Joi.string().uri().optional().default(null),
      branch: Joi.string().optional().default(null),
      headers: Joi.string().optional().default(null),
      enabled: Joi.boolean().optional().default(null)
    }).required()
  },
  pre: perm(PluginRepositoryScope.CREATE),
  handler: async ctx => {
    const { url, branch, headers, enabled } = ctx.request.body
    const { repository } = ctx.state
    if (url !== null) repository!.entity.url = url
    if (branch !== null) repository!.entity.branch = branch
    if (headers !== null) repository!.entity.headers = headers
    if (enabled !== null) repository!.entity.enabled = enabled
    await repository!.entity.save()
    await pluginStore.reload()
    ctx.body = repository!.toJSON()
  }
})

export default api
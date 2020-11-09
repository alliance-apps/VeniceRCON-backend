import { PluginStore as PluginStoreEntity } from "@entity/PluginStore"
import { perm } from "@service/koa/permission"
import { PluginRepositoryScope } from "@service/permissions/Scopes"
import { pluginStore } from "@service/plugin"
import Router from "koa-joi-router"
import repositoryRouter from "./repository"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = pluginStore.providers.map(provider => provider.toJSON())
})

api.post("/reload", async ctx => {
  await pluginStore.reload()
  ctx.body = pluginStore.providers.map(provider => provider.toJSON())
})

api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      url: Joi.string().uri().required(),
      branch: Joi.string().optional().default("main"),
      headers: Joi.string().optional().default("{}")
    }).required()
  },
  pre: perm(PluginRepositoryScope.CREATE),
  handler: async ctx => {
    const { url, branch, headers } = ctx.request.body
    const repo = await PluginStoreEntity.from({ url, branch, headers, enabled: false })
    await pluginStore.reload()
    ctx.body = repo
  }
})


api.param("repositoryId", async (id, ctx, next) => {
  if (isNaN(parseInt(id, 10))) return ctx.status = 400
  const repository = pluginStore.getProvider(parseInt(id, 10))
  if (!repository) return ctx.status = 404
  ctx.state.repository = repository
  await next()
})

api.use("/:repositoryId", repositoryRouter.middleware())


export default api
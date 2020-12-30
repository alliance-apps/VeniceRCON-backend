import { PluginStoreType } from "@entity/PluginStore"
import { perm } from "@service/koa/permission"
import { PluginRepositoryScope } from "@service/permissions/Scopes"
import { pluginStore } from "@service/plugin"
import Router from "koa-joi-router"
import { GithubProvider } from "../../../plugin/store/provider/GithubProvider"
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
      type: Joi.string().allow(PluginStoreType.GITHUB).required(),
      username: Joi.string().required(),
      repository: Joi.string().required(),
      branch: Joi.string().required()
    }).required()
  },
  pre: perm(PluginRepositoryScope.CREATE),
  handler: async ctx => {
    const { username, repository, branch } = ctx.request.body
    try {
      await GithubProvider.verify({ username, repository, branch })
    } catch (e) {
      ctx.body = { message: e.message }
      return ctx.status = 400
    }
    const repo = await GithubProvider.createProvider({ username, repository, branch })
    await pluginStore.reload()
    ctx.body = repo
  }
})


api.param("repositoryId", async (id, ctx, next) => {
  const repositoryId = parseInt(id, 10)
  if (isNaN(repositoryId) || repositoryId <= 0) {
    ctx.body = { message: "invalid repositoryId provided, expected positive number" }
    return ctx.status = 400
  }
  const repository = pluginStore.getProvider(repositoryId)
  if (!repository) return ctx.status = 404
  ctx.state.repository = repository
  await next()
})

api.use("/:repositoryId", repositoryRouter.middleware())


export default api
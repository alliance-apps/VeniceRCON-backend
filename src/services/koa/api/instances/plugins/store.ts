import Router from "koa-joi-router"
import { pluginStore } from "@service/plugin"
import { PluginScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()

api.get("/", async ctx => {
  ctx.body = pluginStore.getPlugins()
})

api.post("/:uuid", perm(PluginScope.CREATE), async ctx => {
  const instance = ctx.state.instance!
  const { uuid } = ctx.request.params
  const plugin = pluginStore.getPluginByUUID(uuid)
  if (!plugin) return ctx.status = 404
  await plugin.downloadTo(instance)
  ctx.status = 200
})

export default api
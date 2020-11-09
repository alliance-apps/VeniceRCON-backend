import Router from "koa-joi-router"
import { pluginStore } from "@service/plugin"
import { PluginScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()

api.get("/", async ctx => {
  ctx.body = pluginStore.getPlugins()
})

api.post("/:storeId/:name", perm(PluginScope.CREATE), async ctx => {
  const instance = ctx.state.instance!
  const { storeId, name } = ctx.request.params
  const provider = pluginStore.getProvider(parseInt(storeId, 10))
  if (!provider) return ctx.status = 404
  const plugin = provider.getPlugin(name)
  if (!plugin) return ctx.status = 404
  try {
    await plugin.downloadTo(instance)
    ctx.status = 200
  } catch (e) {
    instance.log.error(`could not download plugin ${storeId}/${name}`)
    instance.log.error(e)
  }
})

export default api
import Router from "koa-joi-router"
import { Instance } from "@service/battlefield/libs/Instance"
import pluginRouter from "./plugin"
import storeRouter from "./store"

const api = Router()

//lists all installed plugins
api.get("/", async ctx => {
  ctx.body = await ctx.state.instance!.plugin.toJSON()
})

api.param("pluginId", async (pluginId, ctx, next) => {
  const instance: Instance = ctx.state.instance!
  const plugin = instance.plugin.getPluginById(parseInt(pluginId, 10))
  if (!plugin) return ctx.status = 404
  ctx.state.plugin = plugin
  await next()
})

api.use("/store", storeRouter.middleware())
api.use("/:pluginId(\\d+)", pluginRouter.middleware())


export default api
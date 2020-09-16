import { Instance } from "@service/battlefield/libs/Instance"
import Router from "koa-joi-router"
import pluginRouter from "./plugin"

const api = Router()

api.param("plugin", async (name, ctx, next) => {
  const plugins = await (ctx.state.instance! as Instance).plugin.getEnabledPlugins()
  const plugin = plugins.find(plugin => plugin.name === name)
  if (!plugin || !plugin.isRunning()) return ctx.status = 404
  ctx.state.plugin = plugin
  await next()
})

api.use("/:plugin", pluginRouter.middleware())


export default api
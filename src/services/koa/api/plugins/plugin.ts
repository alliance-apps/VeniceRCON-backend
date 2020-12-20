import { Instance } from "@service/battlefield/libs/Instance"
import { Plugin } from "@service/plugin/main/Plugin"
import { Context } from "koa"
import Router from "koa-joi-router"

const api = Router()

const middleware = (method: string) => async (ctx: Context) => {
  const { plugin } = ctx.state as { plugin: Plugin, instance: Instance }
  const { route } = ctx.request.params
  const { body, status } = await plugin.executeRoute(method, route, ctx)
  ctx.body = body
  ctx.status = status
}

api.get("/:route", middleware("GET"))
api.post("/:route", middleware("POST"))
api.patch("/:route", middleware("PATCH"))
api.delete("/:route", middleware("DELETE"))


export default api
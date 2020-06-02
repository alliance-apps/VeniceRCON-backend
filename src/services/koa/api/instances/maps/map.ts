import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { MapScope } from "@service/permissions/Scopes"

const api = Router()

api.get("/", async ctx => {
  ctx.body = ctx.state.map!
})

api.delete("/", perm(MapScope.MANAGE), async ctx => {
  try {
    await ctx.state.instance!.battlefield.delMap(ctx.state.map!.index)
    ctx.state.instance!.mapList()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

export default api
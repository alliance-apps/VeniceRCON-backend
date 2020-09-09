import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { MapScope } from "@service/permissions/Scopes"

const api = Router()

api.get("/", async ctx => {
  ctx.body = ctx.state.map!
})

api.patch("/position/:toIndex", perm(MapScope.MANAGE), async ctx => {
  const { index, map, mode, rounds } = ctx.state.map!
  const toIndex = parseInt(ctx.request.params.toIndex, 10)
  if (isNaN(toIndex)) {
    ctx.status = 400
    return ctx.body = { message: "invalid index given, expected a number" }
  }
  //maximum allowed map index
  const maximum =  ctx.state.instance!.state.get("maps").length + 1
  if (toIndex < 0 || toIndex > maximum) {
    ctx.status = 400
    return ctx.body = { message: `invalid index given, expected a number within 0-${maximum}` }
  }
  const { battlefield } = ctx.state.instance!
  try {
    console.log({ index, toIndex, map })
    await battlefield.delMap(index)
    await battlefield.addMap(map, mode, rounds, toIndex)
    await ctx.state.instance!.mapList()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.post("/next", perm(MapScope.SWITCH), async ctx => {
  try {
    const { instance } = ctx.state
    await instance!.battlefield
      .setNextMapIndex(ctx.state.map!.index)
    instance!.currentMapIndices()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
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
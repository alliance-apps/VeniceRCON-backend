import Router from "koa-joi-router"
import { ModScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()

api.post("/", perm(ModScope.CREATE), async ctx => {
  await ctx.state.instance!.battlefield.addMod(ctx.state.mod!)
  ctx.status = 200
})

api.delete("/", perm(ModScope.DELETE), async ctx => {
  await ctx.state.instance!.battlefield.delMod(ctx.state.mod!)
  ctx.status = 200
})


export default api
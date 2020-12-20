import Router from "koa-joi-router"
import { ReservedSlotScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()

api.delete("/", perm(ReservedSlotScope.DELETE), async ctx => {
  await ctx.state.instance!.battlefield.delReservedSlot(ctx.state.name!)
  ctx.status = 200
})


export default api
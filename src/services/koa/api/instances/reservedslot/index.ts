import Router from "koa-joi-router"
import reservedSlotRouter from "./slot"
import { ReservedSlotScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()
const { Joi } = Router

api.get("/", perm(ReservedSlotScope.ACCESS), async ctx => {
  ctx.body = await ctx.state.instance!.battlefield.getReservedSlots()
})

api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({ name: Joi.string() })
  },
  pre: perm(ReservedSlotScope.CREATE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { name } = ctx.request.body
    try {
      await battlefield.addReservedSlot(name)
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})


api.param("name", async (name, ctx, next) => {
  const names: string[] = await ctx.state.instance!.battlefield.getReservedSlots()
  if (!names.some(n => n === name)) return ctx.status = 404
  ctx.state.name = name
  await next()
})

api.use("/:name", reservedSlotRouter.middleware())

export default api
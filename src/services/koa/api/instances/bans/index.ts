import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { BanScope } from "@service/permissions/Scopes"
import { Battlefield } from "vu-rcon"

const api = Router()
const { Joi } = Router

api.get("/", perm(BanScope.ACCESS), async ctx => {
  ctx.body = await ctx.state.instance!.battlefield.getBans()
})

api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      subset: Joi.string().allow("guid", "name", "ip").required(),
      id: Joi.string().min(1).required(),
      durationType: Joi.string().allow("rounds", "seconds", "perm").required(),
      duration: Joi.number().optional(),
      reason: Joi.string().optional()
    }).required()
  },
  pre: perm(BanScope.CREATE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { reason, subset, id, durationType, duration } = ctx.request.body
    try {
      const time: Battlefield.Timeout = [durationType]
      if (durationType !== "perm") time.push(duration)
      await battlefield.addBan([subset, id], time, reason, true)
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})


api.delete("/:subset/:id", perm(BanScope.DELETE), async ctx => {
  const validSubsets = ["guid", "name", "ip"]
  const { subset, id } = ctx.request.params
  if (!validSubsets.includes(subset)) {
    ctx.body = { message: `subset needs to be one of: ${validSubsets.join(", ")}` }
    return ctx.status = 400
  }
  const { battlefield } = ctx.state.instance!
  try {
    await battlefield.delBan([subset, id])
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

export default api
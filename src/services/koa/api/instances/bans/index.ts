import Router from "koa-joi-router"
import { Battlefield } from "vu-rcon"
import { perm } from "@service/koa/permission"
import { BanScope } from "@service/permissions/Scopes"

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
      id: Joi.string().min(1),
      durationType: Joi.string().allow("rounds", "seconds", "perm").required(),
      duration: Joi.number().optional(),
      reason: Joi.string().optional()
    })
  },
  pre: perm(BanScope.CREATE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { reason, subset, id, durationType, duration } = ctx.request.body
    try {
      await battlefield.addBan([subset, id], [durationType, duration],  reason, true)
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})


api.route({
  method: "DELETE",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      subset: Joi.string().allow("guid", "name", "ip").required(),
      id: Joi.string().min(1)
    })
  },
  pre: perm(BanScope.CREATE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { subset, id } = ctx.request.body
    try {
      await battlefield.delBan([subset, id])
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

export default api
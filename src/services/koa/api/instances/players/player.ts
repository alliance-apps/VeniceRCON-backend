import Router from "koa-joi-router"
import { PlayerScope, BanScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"
import { Battlefield } from "vu-rcon"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.player!
})

api.route({
  method: "POST",
  path: "/kill",
  validate: {
    type: "json",
    body: Joi.object({
      reason: Joi.string().optional()
    }).optional()
  },
  pre: perm(PlayerScope.KILL),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { name } = ctx.state.player!
    try {
      await battlefield.playerKill(name)
      if (ctx.request.body.reason) {
        await battlefield.say(ctx.request.body.reason, ["player", name])
      }
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

api.route({
  method: "POST",
  path: "/kick",
  validate: {
    type: "json",
    body: Joi.object({
      reason: Joi.string().optional()
    })
  },
  pre: perm(PlayerScope.KICK),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { name } = ctx.state.player!
    try {
      await battlefield.playerKick(name, ctx.request.body.reason)
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

api.route({
  method: "POST",
  path: "/ban",
  validate: {
    type: "json",
    body: Joi.object({
      subset: Joi.string().allow("guid", "name", "ip"),
      durationType: Joi.string().allow("rounds", "seconds", "perm").required(),
      duration: Joi.number().optional(),
      reason: Joi.string().optional()
    })
  },
  pre: perm(BanScope.CREATE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { player } = ctx.state
    const { reason, subset, durationType, duration } = ctx.request.body
    const banType = (() => {
      switch (subset) {
        default: 
        case "guid": return ["guid", player!.guid] as Battlefield.IdType
        case "name": return ["guid", player!.name] as Battlefield.IdType
        case "ip": return ["ip", player!.ip] as Battlefield.IdType
      }
    })()
    try {
      await battlefield.addBan(banType, [durationType, duration],  reason, true)
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})


export default api
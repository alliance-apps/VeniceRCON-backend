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
      const { body } = ctx.request
      if (body && body.reason) await battlefield.say(body.reason, ["player", name])
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
      subset: Joi.string().allow("guid", "name", "ip").required(),
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

api.route({
  method: "POST",
  path: "/message",
  validate: {
    type: "json",
    body: Joi.object({
      subset: Joi.string().allow("squad", "team", "player").optional(),
      message: Joi.string(),
      yell: Joi.boolean().default(false).optional(),
      yellDuration: Joi.number().default(8).optional()
    })
  },
  pre: perm(PlayerScope.MESSAGE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { player } = ctx.state
    const { message, subset, yell, yellDuration } = ctx.request.body
    try {
      const sub = (() => {
        switch (subset) {
          case "squad": return ["squad", `${player!.squadId}`]
          case "team": return ["team", `${player!.teamId}`]
          default:
          case "player": return ["player", player!.name]
        }
      })()
      if (yell) {
        await battlefield.yell(message, yellDuration, sub)
      } else {
        await battlefield.say(message, sub)
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
  path: "/move",
  validate: {
    type: "json",
    body: Joi.object({
      teamId: Joi.number(),
      squadId: Joi.number().default(0).optional(),
      kill: Joi.boolean().default(false).optional()
    })
  },
  pre: perm(PlayerScope.MOVE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { player } = ctx.state
    const { squadId, teamId, kill} = ctx.request.body
    try {
      await battlefield.playerMove(player!.name, teamId, squadId, kill)
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})


export default api
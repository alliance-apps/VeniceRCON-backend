import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import { perm } from "@service/koa/permission"
import userRouter from "./users"
import playerRouter from "./players"
import banRouter from "./bans"
import mapRouter from "./maps"
import reservedslotRouter from "./reservedslot"
import pluginRouter from "./plugins"
import varRouter from "./vars"
import eventRouter from "./events"
import { InstanceScope, InstanceUserScope, BanScope, PluginScope, PlayerScope } from "@service/permissions/Scopes"

const api = Router()
const { Joi } = Router

api.delete("/", perm(InstanceScope.DELETE), async ctx => {
  try {
    await instanceManager.removeInstance(ctx.state.instance!.id)
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.state.get()
})

api.patch("/start", perm(InstanceScope.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.start()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.patch("/stop", perm(InstanceScope.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.stop()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.route({
  method: "POST",
  path: "/message",
  validate: {
    type: "json",
    body: Joi.object({
      subset: Joi.string().allow("squad", "team", "player", "all").optional(),
      subsetId: Joi.string().optional(),
      message: Joi.string(),
      yell: Joi.boolean().default(false).optional(),
      yellDuration: Joi.number().default(8).optional()
    })
  },
  pre: perm(PlayerScope.MESSAGE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { message, subset, subsetId, yell, yellDuration } = ctx.request.body
    try {
      const sub = (() => {
        switch (subset) {
          case "squad": return ["squad", subsetId]
          case "team": return ["team", subsetId]
          case "player": return ["player", subsetId]
          default:
          case "all": return ["all"]
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

api.use("/players", playerRouter.middleware())
api.use("/users", perm(InstanceUserScope.ACCESS), userRouter.middleware())
api.use("/bans", perm(BanScope.ACCESS), banRouter.middleware())
api.use("/maps", mapRouter.middleware())
api.use("/vars", varRouter.middleware())
api.use("/reservedslot", reservedslotRouter.middleware())
api.use("/plugins", perm(PluginScope.ACCESS), pluginRouter.middleware())
api.use("/events", eventRouter.middleware())

export default api
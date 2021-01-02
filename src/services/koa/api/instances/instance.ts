import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"
import { perm } from "@service/koa/permission"
import userRouter from "./users"
import logRouter from "./logs"
import playerRouter from "./players"
import banRouter from "./bans"
import mapRouter from "./maps"
import reservedslotRouter from "./reservedslot"
import pluginRouter from "./plugins"
import varRouter from "./vars"
import eventRouter from "./events"
import modRouter from "./mods"
import { InstanceScope, InstanceUserScope, BanScope, PluginScope, PlayerScope, ModScope } from "@service/permissions/Scopes"
import { InstanceContainer } from "@service/container/InstanceContainer"

const api = Router()
const { Joi } = Router

api.delete("/", perm(InstanceScope.DELETE), async ctx => {
  await instanceManager.removeInstance(ctx.state.instance!.id)
  ctx.status = 200
})

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.state.get()
})

api.route({
  method: "PATCH",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().min(1024).max(65536).required(),
      password: Joi.string().required()
    }).required()
  },
  pre: perm(InstanceScope.UPDATE),
  handler: async ctx => {
    const { host, port, password } = ctx.request.body
    const instance = ctx.state.instance!
    const entity = await instanceManager.hostAlreadyUsed(host, port)
    if (entity && entity.id !== instance.id) {
      ctx.body = { message: `${host}:${port} already exists` }
      return ctx.status = 400
    }
    await instance.updateConnection({ host, port, password })
    ctx.status = 200
  }
})

api.patch("/start", perm(InstanceScope.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.start()
    ctx.status = 200
  } catch (e) {
    ctx.status = 400
    ctx.body = { message: e.message }
  }
})

api.patch("/stop", perm(InstanceScope.UPDATE), async ctx => {
  try {
    await ctx.state.instance!.stop()
    ctx.status = 200
  } catch (e) {
    ctx.status = 400
    ctx.body = { message: e.message }
  }
})

api.route({
  method: "POST",
  path: "/raw",
  validate: {
    type: "json",
    body: Joi.object({
      words: Joi.array().items(Joi.string()).required()
    }).required()
  },
  pre: perm(InstanceScope.CONSOLE),
  handler: async ctx => {
    try {
      const { words } = ctx.request.body
      ctx.body = await ctx.state.instance!.connection.battlefield.createCommand(words.shift(), ...words).send()
      ctx.status = 200
    } catch (e) {
      ctx.status = 400
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
  }
})

api.route({
  method: "PATCH",
  path: "/teamtickets",
  validate: {
    type: "json",
    body: Joi.object({
      team: Joi.number().min(0).required(),
      count: Joi.number().min(0).required()
    })
  },
  pre: perm(PlayerScope.TICKETS),
  handler: async ctx => {
    const instance = ctx.state.instance!
    if (instance.state.get("version") !== InstanceContainer.Version.VU) {
      ctx.body = { message: "this feature is only available on Venice Unleashed Servers" }
      return ctx.status = 400
    }
    await instance.setTeamTicketCount(ctx.request.body.team, ctx.request.body.count)
    ctx.status = 200
  }
})

api.use("/logs", logRouter.middleware())
api.use("/players", playerRouter.middleware())
api.use("/users", perm(InstanceUserScope.ACCESS), userRouter.middleware())
api.use("/bans", perm(BanScope.ACCESS), banRouter.middleware())
api.use("/maps", mapRouter.middleware())
api.use("/vars", varRouter.middleware())
api.use("/reservedslot", reservedslotRouter.middleware())
api.use("/plugins", perm(PluginScope.ACCESS), pluginRouter.middleware())
api.use("/events", eventRouter.middleware())
api.use("/mods", perm(ModScope.ACCESS), modRouter.middleware())

export default api
import Router from "koa-joi-router"
import playerRouter from "./player"
import { Battlefield } from "vu-rcon"
import { Player } from "@entity/Player"
import { FindOperator, Like } from "typeorm"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.state.get("players")
})

api.route({
  method: "POST",
  path: "/search",
  validate: {
    type: "json",
    body: Joi.object({
      guid: Joi.string().optional(),
      name: Joi.string().optional()
    })
  },
  handler: async ctx => {
    const { guid, name } = ctx.request.body!
    const search: Record<string, FindOperator<any>> = {}
    if (guid) search.guid = Like(`%${guid}%`)
    if (name) search.name = Like(`%${name}%`)
    if (Object.keys(search).length === 0) return ctx.body = []
    const result = await Player.find({ where: search, take: 20 })
    ctx.body = result.map(res => ({ id: res.id, guid: res.guid, name: res.name }))
  }
})

api.param("guid", async (guid, ctx, next) => {
  const players: Record<string, Battlefield.Player[]> = ctx.state.instance.state.get("players")
  const player = players[guid]
  if (!player) return ctx.status = 404
  ctx.state.player = player
  await next()
})

api.use("/:guid", playerRouter.middleware())

export default api
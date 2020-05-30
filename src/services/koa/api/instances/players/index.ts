import Router from "koa-joi-router"
import { Permission } from "@entity/Permission"
import playerRouter from "./player"
import { Battlefield } from "vu-rcon"

const api = Router()

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.getState().players
})

api.param("guid", async (guid, ctx, next) => {
  const players: Record<string, Battlefield.Player[]> = ctx.state.instance.state.getState().players
  const player = players[guid]
  if (!player) return ctx.status = 404
  ctx.state.player = player
  await next()
})

api.use("/:guid", playerRouter.middleware())

export default api
import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { permissionManager } from "@service/permissions"
import { InstanceUserScope, getScopeNames, getBitMaskFromScopes, getScopesFromMask } from "@service/permissions/Scopes"
import { Player } from "@entity/Player"
import { User } from "@entity/User"

const api = Router()
const { Joi } = Router

api.get("/", perm(InstanceUserScope.ACCESS), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  ctx.body = await getCustomRepository(PermissionRepository)
    .getInstanceUser(instanceId, userId)
})

api.delete("/", perm(InstanceUserScope.REMOVE), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  await permissionManager.removeInstanceAccess(userId, instanceId)
  ctx.status = 200
})

api.get("/bind", async ctx => {
  const { userId } = await ctx.state.permission!
  const user = await User.findOne({ id: userId })
  if (!user) return ctx.status = 404
  ctx.body = (await user.players).map(p => ({
    id: p.id, name: p.name, guid: p.guid
  }))
})

api.route({
  method: "POST",
  path: "/bind",
  validate: {
    type: "json",
    body: Joi.object({
      playerId: Joi.number().positive().required()
    }).required()
  },
  pre: perm(InstanceUserScope.UPDATE),
  handler: async ctx => {
    const { playerId } = ctx.request.body
    const userId = ctx.state.permission!.userId
    const [player, user] = await Promise.all([
      Player.findOne({ id: playerId }),
      User.findOne({ id: userId })
    ])
    if (!player || !user) {
      if (!player) ctx.body = { message: `no player with id "${playerId}" found!` }
      if (!user) ctx.body = { message: `no user with id "${userId}" found!` }
      return ctx.status = 404
    }
    const players = await user.players
    if (players.some(p => p.id === playerId)) return ctx.status = 200
    await user.addPlayer(player)
    return ctx.status = 200
  }
})

api.route({
  method: "DELETE",
  path: "/bind",
  validate: {
    type: "json",
    body: Joi.object({
      playerId: Joi.number().positive().required()
    }).required()
  },
  pre: perm(InstanceUserScope.UPDATE),
  handler: async ctx => {
    const { playerId } = ctx.request.body
    const userId = ctx.state.permission!.userId
    const [player, user] = await Promise.all([
      Player.findOne({ id: playerId }),
      User.findOne({ id: userId })
    ])
    if (!player || !user) {
      if (!player) ctx.body = { message: `no player with id "${playerId}" found!` }
      if (!user) ctx.body = { message: `no user with id "${userId}" found!` }
      return ctx.status = 404
    }
    const players = await user.players
    if (!players.some(p => p.id === playerId)) return ctx.status = 200
    await user.delPlayer(player)
    return ctx.status = 200
  }
})

api.route({
  method: "PATCH",
  path: "/permissions",
  validate: {
    type: "json",
    body: Joi.object({
      add: Joi.array().allow(...getScopeNames()).optional().default([]),
      remove: Joi.array().allow(...getScopeNames()).optional().default([])
    }).required()
  },
  pre: perm(InstanceUserScope.UPDATE),
  handler: async ctx => {
    const { add, remove } = ctx.request.body
    const mask = getBitMaskFromScopes([...add, ...remove])
    const ok = await permissionManager.hasPermissions({
      user: ctx.state.token!.id,
      instance: ctx.state.instance!.id,
      scope: mask
    })
    if (!ok) {
      ctx.body = { message: "you tried to update a permission which you do not have access to"}
      return ctx.status = 403
    }
    ctx.state.permission!.mask |= getBitMaskFromScopes(add)
    ctx.state.permission!.mask &= ~getBitMaskFromScopes(remove)
    await ctx.state.permission!.save()
    ctx.body = { scopes: getScopesFromMask(ctx.state.permission!.mask) }
    ctx.status = 200
  }
})

export default api
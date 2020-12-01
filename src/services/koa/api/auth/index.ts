import Router from "koa-joi-router"
import { User } from "@entity/User"
import { Player } from "@entity/Player"
import { createToken } from "@service/koa/jwt"
import { permissionManager } from "@service/permissions"
import { Invite } from "@entity/Invite"
import { FindOperator, IsNull, Like } from "typeorm"


const { Joi } = Router
const router = Router()

/**
 * login to a specific user account
 */
router.route({
  method: "POST",
  path: "/login",
  validate: {
    type: "json",
    body: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required()
    }).required()
  },
  handler: async ({ request, response }) => {
    const user = await User.findOne({ username: request.body.username })
    if (!user || !(await user.validatePassword(request.body.password))) {
      response.status = 400
      response.body = { message: "invalid username or password" }
      return
    }
    response.body = { token: await createToken({ user }) }
  }
})

/**
 * register a new user account with a token
 */
router.route({
  method: "POST",
  path: "/register",
  validate: {
    type: "json",
    body: Joi.object({
      username: Joi.string().min(3).max(64).required(),
      password: Joi.string().min(6).max(64).required(),
      token: Joi.string().hex().required()
    }).required()
  },
  handler: async ctx => {
    const invite = await Invite.findOne({ token: ctx.request.body.token, userId: IsNull() })
    if (!invite) {
      ctx.status = 400
      ctx.body = { message: "invalid token or token has already been used"}
      return
    }
    if (await User.findOne({ username: ctx.request.body.username })) {
      ctx.status = 400
      ctx.bdoy = { message: "username already taken" }
      return
    }
    const user = await User.from({
      username: ctx.request.body.username,
      password: ctx.request.body.password
    })
    await invite.consume(user)
    ctx.body = { token: await createToken({ user }) }
  }
})

/**
 * consume an invite token with an already created user account
 */
router.route({
  method: "POST",
  path: "/invite",
  validate: {
    type: "json",
    body: Joi.object({
      token: Joi.string().hex().required()
    }).required()
  },
  handler: async ctx => {
    if (!ctx.state.token) return ctx.status = 401
    const user = await User.findOne({ id: ctx.state.token.id })
    if (!user) return ctx.status = 401
    const invite = await Invite.findOne({ token: ctx.request.body.token, userId: IsNull() })
    if (!invite || await permissionManager.hasInstanceAccess(user.id, invite.instanceId)) {
      ctx.status = 400
      ctx.body = { message: "invalid token, token has already been used or you already have access to this instance"}
      return
    }
    await invite.consume(user)
    ctx.status = 200
  }
})

/**
 * update current password
 */
router.route({
  method: "POST",
  path: "/update-password",
  validate: {
    type: "json",
    body: Joi.object({
      oldPassword: Joi.string().min(6).max(64).required(),
      newPassword: Joi.string().min(6).max(64).required()
    }).required()
  },
  handler: async ctx => {
    if (!ctx.state.token) return ctx.status = 401
    const user = await User.findOne({ id: ctx.state.token.id })
    if (!user) return ctx.status = 401
    try {
      await user.validatePassword(ctx.request.body.oldPassword)
    } catch (e) {
      ctx.body = { message: "current password invalid"}
      return ctx.status = 403
    }
    await user.updatePassword(ctx.request.body.newPassword)
    ctx.status = 200
  }
})

/**
 * get informations about the current jwt token
 */
router.get("/whoami", async ctx => {
  if (!ctx.state.token) return ctx.status = 401
  const permissions = await permissionManager.getPermissions(ctx.state.token.id)
  ctx.body = {
    permissions: permissions.map(p => ({ instance: p.instanceId, root: p.root, scopes: p.getScopes() })),
    token: ctx.state.token
  }
})

/**
 * search for a specific player by name or guid
 */
router.route({
  method: "POST",
  path: "/search-player",
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

router.get("/binding", async ctx => {
  if (!ctx.state.token) return ctx.status = 401
  const { id } = ctx.state.token
  const user = await User.findOne({ id })
  if (!user) return ctx.status = 404 //something went badly wrong if this happens
  ctx.body = (await user.players).map(p => ({
    id: p.id, name: p.name, guid: p.guid
  }))
})

router.route({
  method: "POST",
  path: "/binding",
  validate: {
    type: "json",
    body: Joi.object({
      playerId: Joi.number().positive().required()
    }).required()
  },
  handler: async ctx => {
    if (!ctx.state.token) return ctx.status = 401
    const { id } = ctx.state.token
    const { playerId } = ctx.request.body
    const [player, user] = await Promise.all([
      Player.findOne({ id: playerId }),
      User.findOne({ id })
    ])
    if (!player || !user) {
      if (!player) ctx.body = { message: `no player with id "${playerId}" found!` }
      if (!user) ctx.body = { message: `no user with id "${id}" found!` }
      return ctx.status = 404
    }
    const players = await user.players
    if (players.some(p => p.id === playerId)) return ctx.status = 200
    await user.addPlayer(player)
    return ctx.status = 200
  }
})

router.route({
  method: "DELETE",
  path: "/binding",
  validate: {
    type: "json",
    body: Joi.object({
      playerId: Joi.number().positive().required()
    }).required()
  },
  handler: async ctx => {
    if (!ctx.state.token) return ctx.status = 401
    const { playerId } = ctx.request.body
    const { id } = ctx.state.token
    const [player, user] = await Promise.all([
      Player.findOne({ id: playerId }),
      User.findOne({ id })
    ])
    if (!player || !user) {
      if (!player) ctx.body = { message: `no player with id "${playerId}" found!` }
      if (!user) ctx.body = { message: `no user with id "${id}" found!` }
      return ctx.status = 404
    }
    const players = await user.players
    if (!players.some(p => p.id === playerId)) return ctx.status = 200
    await user.delPlayer(player)
    return ctx.status = 200
  }
})


export default router
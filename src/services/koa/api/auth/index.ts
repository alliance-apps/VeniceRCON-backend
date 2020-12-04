import Router from "koa-joi-router"
import { User } from "@entity/User"
import { Player } from "@entity/Player"
import { createToken } from "@service/koa/jwt"
import { permissionManager } from "@service/permissions"
import { Invite } from "@entity/Invite"
import { FindOperator, IsNull, Like } from "typeorm"
import ratelimit from "koa-ratelimit"
import { isEnabled, sendMail } from "@service/mail"
import { config } from "@service/config"
import winston from "winston"
import { randomBytes } from "crypto"


const { Joi } = Router
const router = Router()

router.route({
  method: "POST",
  path: "/forgot-password",
  validate: {
    type: "json",
    body: Joi.object({
      email: Joi.string().required(),
    })
  },
  pre: ratelimit({
    driver: "memory",
    db: new Map(),
    //3 requests per 15 minutes
    duration: 15 * 60 * 1000,
    max: 3,
    errorMessage: "Sometimes You Just Have to Slow Down.",
    id: ctx => ctx.ip,
    disableHeader: true
  }),
  handler: async ctx => {
    if (!isEnabled()) return ctx.status = 503
    const { email } = ctx.request.body
    winston.info(`${ctx.ip} requested forgot-password for email ${email}`)
    const user = await User.findOne({ email })
    //dont expose informations that the user has not been found or no email address is available
    if (!user) {
      winston.info(`email "${email}" not found which has been requested by ${ctx.ip}`)
      return ctx.status = 200
    }
    const password = randomBytes(6).toString("base64")
    try {
      const replace = (text: string) => text.replace(/%username%/g, user.username).replace(/%password%/g, password)
      await user.updatePassword(password)
      await sendMail(
        email,
        replace(config.smtp.content.subject),
        replace(config.smtp.content.text)
      )
      await user.save()
      winston.info(`sent new password for ${user.username} to ${email} from requester ${ctx.ip}`)
      ctx.status = 200
    } catch (e) {
      winston.error(e)
      ctx.status = 500
    }
  }
})

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
      email: Joi.string().email().optional(),
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
      password: ctx.request.body.password,
      email: ctx.request.body.email
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
 * allows password to be undefined to not modify it
 * allows email to be undefined to not modify it or null to delete it
 */
router.route({
  method: "POST",
  path: "/update-self",
  validate: {
    type: "json",
    body: Joi.object({
      currentPassword: Joi.string().min(1).max(256).required(),
      password: Joi.string().min(6).max(64).optional(),
      email: Joi.string().email().optional().allow(null)
    }).required()
  },
  handler: async ctx => {
    if (!ctx.state.token) return ctx.status = 401
    const user = await User.findOne({ id: ctx.state.token.id })
    if (!user) return ctx.status = 401
    const { currentPassword, password, email } = ctx.request.body
    try {
      await user.validatePassword(currentPassword)
    } catch (e) {
      ctx.body = { message: "current password invalid"}
      return ctx.status = 403
    }
    if (!password && email === undefined) return ctx.status = 200
    if (password) await user.updatePassword(password)
    if (email !== undefined) user.email = email
    await user.save()
    ctx.status = 200
  }
})

/**
 * get informations about the current jwt token
 */
router.get("/whoami", async ctx => {
  if (!ctx.state.token) return ctx.status = 401
  const [permissions, user] = await Promise.all([
    permissionManager.getPermissions(ctx.state.token.id),
    User.findOne({ id: ctx.state.token.id })
  ])
  if (!user) return ctx.status = 401
  ctx.body = {
    email: user.email,
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

router.delete("/binding/:playerId", async ctx => {
  if (!ctx.state.token) return ctx.status = 401
  const playerId = parseInt(ctx.param.playerId, 10)
  if (playerId <= 0 || isNaN(playerId)) return ctx.status = 400
  const { id } = ctx.state.token!
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
})

export default router
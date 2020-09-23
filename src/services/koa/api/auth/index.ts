import Router from "koa-joi-router"
import { User } from "@entity/User"
import { createToken } from "@service/koa/jwt"
import { permissionManager } from "@service/permissions"
import { Invite } from "@entity/Invite"
import { IsNull } from "typeorm"

const { Joi } = Router
const router = Router()


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

router.get("/whoami", async ctx => {
  if (!ctx.state.token) return ctx.status = 401
  const permissions = await permissionManager.getPermissions(ctx.state.token.id)
  ctx.body = {
    permissions: permissions.map(p => ({ instance: p.instanceId, root: p.root, scopes: p.getScopes() })),
    token: ctx.state.token
  }
})

export default router
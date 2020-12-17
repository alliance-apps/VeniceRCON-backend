import Router, { Joi } from "koa-joi-router"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { Invite } from "@entity/Invite"
import { Permission } from "@entity/Permission"
import { perm } from "@service/koa/permission"
import userRouter from "./user"
import { getBitMaskFromScopes, getScopeNames, InstanceUserScope } from "@service/permissions/Scopes"
import { permissionManager } from "@service/permissions"

const api = Router()

//lists users
api.get("/", async ctx => {
  ctx.body = await getCustomRepository(PermissionRepository).getInstanceUsers(ctx.state.instance!.id)
})

//lists all invite tokens
api.get("/invite", perm(InstanceUserScope.ACCESS), async ctx => {
  const invites = await Invite.createQueryBuilder("inv")
    .where({ instanceId: ctx.state.instance!.id })
    .select([
      "inv.id", "inv.created", "inv.modified", "inv.token",
      "issuer.id", "issuer.username",
      "user.id", "user.username"
    ])
    .leftJoin("inv.issuer", "issuer")
    .leftJoin("inv.user", "user")
    .getRawMany()
  ctx.body = invites.map(({ __issuer__, __user__, ...rest}) => ({
    ...rest,
    user: __user__,
    issuer: __issuer__
  }))
})

//creates an invite token with certain permissions
api.route({
  method: "POST",
  path: "/invite",
  validate: {
    type: "json",
    body: Joi.object({
      scopes: Joi.array().allow(...getScopeNames()).optional().default(["INSTANCE#ACCESS"])
    }).required()
  },
  pre: perm(InstanceUserScope.CREATE),
  handler: async ctx => {
    const { scopes } = ctx.request.body
    const mask = getBitMaskFromScopes(scopes)
    const ok = await permissionManager.hasPermissions({
      user: ctx.state.token!.id,
      instance: ctx.state.instance!.id,
      scope: mask
    })
    if (!ok) {
      ctx.body = { message: "you tried to create a token with permissions you do not have access to"}
      return ctx.status = 403
    }
    const { token } = await Invite.from({
      issuer: ctx.state.token!.id,
      instance: ctx.state.instance!.id,
      mask
    })
    ctx.body = { token }
    ctx.status = 200
  }
})

api.param("userId", async (id, ctx, next) => {
  const userId = parseInt(id, 10)
  if (isNaN(userId)) return ctx.status = 401
  const permission = await Permission.findOne({
    instanceId: ctx.state.instance.state.id, userId
  })
  if (!permission) return ctx.status = 404
  ctx.state.permission = permission
  await next()
})

api.use("/:userId", perm(InstanceUserScope.ACCESS), userRouter.middleware())

export default api
import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { permissionManager } from "@service/permissions"
import { InstanceUserScope, getScopeNames, getBitMaskFromScopes } from "@service/permissions/Scopes"

const { Joi } = Router
const api = Router()

api.get("/", perm(InstanceUserScope.ACCESS), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  ctx.body = await getCustomRepository(PermissionRepository).getInstanceUser(instanceId, userId)
})

api.delete("/", perm(InstanceUserScope.REMOVE), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  await permissionManager.removeInstanceAccess(userId, instanceId)
  ctx.status = 200
})

api.route({
  method: "PATCH",
  path: "/permissions",
  validate: {
    type: "json",
    body: Joi.object({
      scopes: Joi.array().allow(...getScopeNames())
    })
  },
  pre: perm(InstanceUserScope.UPDATE),
  handler: async ctx => {
    const mask = getBitMaskFromScopes(ctx.request.body.scopes)
    const ok = await permissionManager.hasPermissions({
      user: ctx.state.token!.id,
      instance: ctx.state.instance!.id,
      scope: mask
    })
    if (!ok) {
      ctx.body = { message: "you tried to set a permission which you do not have access to"}
      return ctx.status = 403
    }
    ctx.state.permission!.mask = mask
    await ctx.state.permission!.save()
    ctx.status = 200
  }
})

export default api
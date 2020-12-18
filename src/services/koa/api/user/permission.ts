import { perm } from "@service/koa/permission"
import { permissionManager } from "@service/permissions"
import { getBitMaskFromScopes, getScopeNames, UserScope } from "@service/permissions/Scopes"
import Router from "koa-joi-router"

const api = Router()
const { Joi } = Router

//delete the user completely
api.delete("/", perm(UserScope.MODIFY), async ctx => {
  await ctx.state.permission!.remove()
  permissionManager.removeUserFromCache(ctx.state.user!)
  await ctx.state.user!.reload()
  ctx.body = await ctx.state.user!.getUserAndPermissions()
})

//update user properties
api.route({
  method: "PATCH",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      scopes: Joi.array().allow(...getScopeNames()).required()
    }).required()
  },
  pre: perm(UserScope.MODIFY),
  handler: async ctx => {
    const permission = ctx.state.permission!
    const mask = getBitMaskFromScopes(ctx.request.body.scopes)
    const diff = permission.mask ^ mask
    const ok = await permissionManager.hasPermissions({
      user: ctx.state.token!.id,
      instance: permission.instanceId,
      scope: diff
    })
    if (!ok) {
      ctx.body = { message: "you can not set permissions you do not have access to" }
      return ctx.status = 401
    }
    permission.mask = mask
    await permission.save()
    permissionManager.removeUserFromCache(ctx.state.user!)
    await ctx.state.user!.reload()
    ctx.body = await ctx.state.user!.getUserAndPermissions()
  }
})


export default api
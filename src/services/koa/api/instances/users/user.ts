import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { permissionManager } from "@service/permissions"
import { InstanceUserScope, getScopeNames, getBitFromName, Scopes } from "@service/permissions/Scopes"

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
  handler: async ctx => {
    const { scopes } = ctx.request.body
    const bits: Scopes[] = scopes.map((s: string) => getBitFromName(s))
    const set = await Promise.all(bits.map(async scope => permissionManager.hasPermission({
      user: ctx.state.token!.id, instance: ctx.state.instance!.id, scope
    })))
    if (!set.every(s => s)) {
      ctx.body = { message: "you tried to set a permission which you do not have access to"}
      return ctx.status = 403
    }
    ctx.state.permission!.mask = "00"
    await ctx.state.permission!.setPermissions(scopes.map((s: string) => getBitFromName(s)))
    ctx.status = 200
  }
})

export default api
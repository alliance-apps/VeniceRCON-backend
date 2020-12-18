import { perm } from "@service/koa/permission"
import { permissionManager } from "@service/permissions"
import { getBitMaskFromScopes, getScopeNames, UserScope } from "@service/permissions/Scopes"
import Router from "koa-joi-router"
import userPermissionRouter from "./permission"
import { DEFAULT_USERNAME } from "@service/orm"
import { Permission } from "@entity/Permission"

const api = Router()
const { Joi } = Router

//gets informations about the user
api.get("/", async ctx => {
  ctx.body = await ctx.state.user!.getUserAndPermissions()
})

//delete the user completely
api.delete("/", perm(UserScope.REMOVE), async ctx => {
  if (ctx.state.user!.username === DEFAULT_USERNAME) {
    ctx.body = { message: "can not remove default user" }
    return ctx.status = 400
  }
  await ctx.state.user!.remove()
  await permissionManager.removeUserFromCache(ctx.state.user!)
  ctx.status = 200
})

//update user properties
api.route({
  method: "PATCH",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      password: Joi.string().min(6).max(64).optional(),
      email: Joi.string().email().optional().allow(null)
    }).required()
  },
  pre: perm(UserScope.MODIFY),
  handler: async ctx => {
    const { password, email } = ctx.request.body
    if (!password && email === undefined) return ctx.status = 200
    const user = ctx.state.user!
    if (password) await user.updatePassword(password)
    if (email !== undefined) user.email = email
    await user.save()
    ctx.status = 200
  }
})

//adds a user permission
api.route({
  method: "POST",
  path: "/permissions",
  validate: {
    type: "json",
    body: Joi.object({
      root: Joi.boolean().optional().default(false),
      instanceId: Joi.number().allow(null).optional().default(null),
      scopes: Joi.array().allow(...getScopeNames()).required()
    }).required()
  },
  pre: perm(UserScope.MODIFY),
  handler: async ctx => {
    const { root, instanceId, scopes }: { root: boolean, instanceId: null|number, scopes: string[]} = ctx.request.body
    if ((root && typeof instanceId === "number") ||
       (!root && typeof instanceId !== "number")
    ) {
      ctx.body = { message: "either root is true or instanceId should be a number" }
      return ctx.status = 400
    }
    const mask = getBitMaskFromScopes(scopes)
    const ok = await permissionManager.hasPermissions({
      user: ctx.state.token!.id,
      instance: typeof instanceId === "number" ? instanceId : true,
      scope: mask
    })
    if (!ok) {
      ctx.body = { message: "you can not set permissions you do not have access to" }
      return ctx.status = 401
    }
    await Permission.from({
      user: ctx.state.user!,
      //@ts-ignore
      instance: instanceId,
      root,
      scopes: [mask]
    })
    await ctx.state.user!.reload()
    ctx.body = await ctx.state.user!.getUserAndPermissions()
  }
})


api.param("permissionId", async (id, ctx, next) => {
  const permId = parseInt(id, 10)
  if (isNaN(permId) || permId <= 0) {
    ctx.body = { message: "invalid userId provided, expected positive number" }
    return ctx.status = 400
  }
  const perm = await Permission.findOne({ id: permId, userId: ctx.state.user!.id })
  if (!perm) return ctx.status = 404
  ctx.state.permission = perm
  await next()
})

api.use("/permissions/:permissionId", userPermissionRouter.middleware())

export default api
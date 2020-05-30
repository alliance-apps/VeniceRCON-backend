import Router from "koa-joi-router"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { Invite } from "@entity/Invite"
import { Permission } from "@entity/Permission"
import { perm } from "@service/koa/permission"
import userRouter from "./user"
import { InstanceUserScope } from "@service/permissions/Scopes"

const api = Router()

//lists users
api.get("/", async ctx => {
  ctx.body = await getCustomRepository(PermissionRepository).getInstanceUsers(ctx.state.instance!.id)
})

//lists all invite tokens
api.get("/invite", perm(InstanceUserScope.ACCESS), async ctx => {
  ctx.body = await Invite.find({
    instanceId: ctx.state.instance!.id
  })
})

api.post("/invite", perm(InstanceUserScope.CREATE), async ctx => {
  const { token } = await Invite.from({
    issuer: ctx.state.token!.id,
    instance: ctx.state.instance!.id
  })
  ctx.body = { token }
})

api.param("userId", async (id, ctx, next) => {
  const userId = parseInt(id)
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
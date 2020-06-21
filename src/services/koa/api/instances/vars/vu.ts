import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { InstanceUserScope } from "@service/permissions/Scopes"

const api = Router()

api.get("/", perm(InstanceUserScope.ACCESS), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  ctx.body = await getCustomRepository(PermissionRepository).getInstanceUser(instanceId, userId)
})


export default api
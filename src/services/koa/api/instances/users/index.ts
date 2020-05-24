import Router from "koa-joi-router"
import { getCustomRepository } from "typeorm"
import { UserRepository } from "@repository/UserRepository"
import { Invite } from "@entity/Invite"
import { Permission } from "@entity/Permission"
import { perm } from "@service/koa/permission"

const api = Router()

//lists users
api.get("/", async ctx => {
  ctx.body = await getCustomRepository(UserRepository).getInstanceUsers(ctx.state.instance!.container.id)
})

//creates a new invite token
api.get("/invite", async ctx => {
  ctx.body = await Invite.find({
    instanceId: ctx.state.instance!.container.id
  })
})

api.post("/invite", perm(Permission.InstanceUser.CREATE), async ctx => {
  const { token } = await Invite.from({
    issuer: ctx.state.token!.id,
    instance: ctx.state.instance!.container.id
  })
  ctx.body = { token }
})

export default api
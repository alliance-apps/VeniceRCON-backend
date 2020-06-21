import Router from "koa-joi-router"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import vuVarRouter from "./vu"
import bf3VarRouter from "./bf3"
import { Instance } from "@service/battlefield/Instance"
import { InstanceContainer } from "@service/container/InstanceContainer"

const api = Router()

api.get("/", async ctx => {
  ctx.body = await getCustomRepository(PermissionRepository).getInstanceUsers(ctx.state.instance!.id)
})

api.use("/bf3", bf3VarRouter.middleware())
api.use("/vu", async (ctx, next) => {
  if ((ctx.state!.instance as Instance).getState().version !== InstanceContainer.Version.VU) {
    ctx.status = 404
  } else {
    await next()
  }
}, vuVarRouter.middleware())

export default api
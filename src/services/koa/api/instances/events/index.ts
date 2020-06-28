import Router from "koa-joi-router"
import chatRouter from "./chat"
import killRouter from "./kill"
import { EventScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()

api.use("/chat", perm(EventScope.CHAT), chatRouter.middleware())
api.use("/kill", perm(EventScope.KILL), killRouter.middleware())

export default api
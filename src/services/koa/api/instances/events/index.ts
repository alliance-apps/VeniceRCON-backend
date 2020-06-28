import Router from "koa-joi-router"
import chatRouter from "./chat"
import { EventScope } from "@service/permissions/Scopes"
import { perm } from "@service/koa/permission"

const api = Router()

api.use("/chat", perm(EventScope.CHAT), chatRouter.middleware())

export default api
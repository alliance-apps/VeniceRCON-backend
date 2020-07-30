import Router from "koa-joi-router"
import { LogMessage } from "@entity/LogMessage"
import { perm } from "@service/koa/permission"
import { InstanceScope, PluginScope } from "@service/permissions/Scopes"

const api = Router()

api.get("/instance", perm(InstanceScope.LOGS), async ctx => {
  ctx.body = (await LogMessage.getMessages(
    ctx.state.instance!.id,
    { source: LogMessage.Source.INSTANCE }
  )).map(e => e.toJSON())
})

api.get("/plugins", perm(PluginScope.LOGS), async ctx => {
  ctx.body = (await LogMessage.getMessages(
    ctx.state.instance!.id,
    { source: LogMessage.Source.PLUGIN }
  )).map(e => e.toJSON())
})

api.get("/plugins/:pluginName", perm(PluginScope.LOGS), async ctx => {
  ctx.body = (await LogMessage.getMessages(
    ctx.state.instance!.id,
    { source: LogMessage.Source.PLUGIN, sourceLocation: ctx.request.params.pluginName }
  )).map(e => e.toJSON())
})

export default api
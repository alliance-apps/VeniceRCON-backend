import { perm } from "@service/koa/permission"
import { ModScope } from "@service/permissions/Scopes"
import Router from "koa-joi-router"
import modRouter from "./mod"

const api = Router()

api.use(async (ctx, next) => {
  const version = ctx.state.instance!.state.get("version")
  if (version !== "VU") {
    ctx.body = { message: "Modlist is only available on VeniceUnleashed Servers!" }
    return ctx.status = 400
  }
  await next()
})

api.get("/", async ctx => {
  const [available, running, next] = await Promise.all([
    ctx.state.instance!.battlefield.getAvailableMods(),
    ctx.state.instance!.battlefield.getRunningMods(),
    ctx.state.instance!.battlefield.getMods()
  ])
  ctx.body = {
    available: available.map(mod => mod.toLowerCase()),
    running: running.map(mod => mod.toLowerCase()),
    next: next.map(mod => mod.toLowerCase())
  }
})

api.patch("/clear", perm(ModScope.DELETE), async ctx => {
  await ctx.state.instance!.battlefield.clearMods()
  ctx.status = 200
})

api.patch("/reload", perm(ModScope.UPDATE), async ctx => {
  await ctx.state.instance!.battlefield.reloadExtensions()
  ctx.status = 200
})

api.param("name", async (name, ctx, next) => {
  const mods: string[] = await ctx.state.instance!.battlefield.getAvailableMods()
  if (!mods.some(mod => mod.toLowerCase() === name)) return ctx.status = 404
  ctx.state.mod = name
  await next()
})

api.use("/:name", modRouter.middleware())

export default api
import Router from "koa-joi-router"

const api = Router()

api.get("/", async ctx => {
  ctx.body = await ctx.state.user!.getUserAndPermissions()
})

export default api
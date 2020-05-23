import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"

const api = Router()

api.delete("/", async ctx => {
  try {
    await instanceManager.removeInstance(ctx.state.instance!.container.id)
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.container.getStateClone()
})

api.patch("/start", async ctx => {
  try {
    await ctx.state.instance!.start()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.patch("/stop", async ctx => {
  try {
    await ctx.state.instance!.stop()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

export default api
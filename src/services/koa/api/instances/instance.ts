import Router from "koa-joi-router"
import { instanceManager } from "@service/battlefield"

const { Joi } = Router
const api = Router()

api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      host: Joi.string(),
      port: Joi.number().min(1024).max(65536),
      password: Joi.string()
    })
  },
  handler: async ctx => {
    try {
      await instanceManager.addInstance({
        host: ctx.request.body.host,
        port: ctx.request.body.port,
        password: ctx.request.body.password
      })
      ctx.status = 200
    } catch (e) {
      ctx.status = 500
      ctx.body = { message: e.message }
    }
  }
})

api.patch("/start", async ctx => {
  try {
    await ctx["instance"].start()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.patch("/stop", async ctx => {
  try {
    await ctx["instance"].stop()
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

api.delete("/", async ctx => {
  try {
    await instanceManager.removeInstance(ctx.instance.container.id)
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
    ctx.body = { message: e.message }
  }
})

export default api
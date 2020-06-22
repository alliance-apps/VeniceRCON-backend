import Router from "koa-joi-router"
import { Instance } from "@service/battlefield/Instance"
import winston from "winston"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.getState().vars
})

api.route({
  method: "PATCH",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object(
      Object.fromEntries(
        [...Instance.VAR_SETTER_BF3, ...Instance.VAR_SETTER_VU]
          .map(k => [k, Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()).optional()]
      ))
    )
  },
  handler: async ctx => {
    try {
      const { instance } = ctx.state
      await Promise.all(Object.keys(ctx.request.body!)
        .map(k => instance!.updateVariable(k, ctx.request.body[k]))
      )
      ctx.body = instance!.getState().vars
    } catch (e) {
      ctx.status = 500
      ctx.body = e.message
      winston.error(e)
    }
  }
})

export default api
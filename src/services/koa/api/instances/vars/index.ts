import Router from "koa-joi-router"
import { Instance } from "@service/battlefield/Instance"
import winston from "winston"
import { InstanceContainer } from "@service/container/InstanceContainer"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.getState().vars
})

api.get("/options", async ctx => {
  const getters = [...Instance.VAR_BF3]
  const setters = [...Instance.VAR_SETTER_BF3]
  if (ctx.state.instance!.getState().version === InstanceContainer.Version.BF3) {
    getters.push(...Object.keys(Instance.VAR_BF3_OPTIONAL))
    if (ctx.state.instance!.getState().vars.ranked) getters.push(...Object.keys(Instance.VAR_BF3_RANKED))
  } else if (ctx.state.instance!.getState().version === InstanceContainer.Version.VU) {
    setters.push(...Instance.VAR_SETTER_VU)
  }
  ctx.body = { getters, setters }
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
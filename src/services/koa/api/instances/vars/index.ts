import Router from "koa-joi-router"
import { Instance } from "@service/battlefield/libs/Instance"
import { perm } from "@service/koa/permission"
import { VariableScope } from "@service/permissions/Scopes"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = ctx.state.instance!.state.get("vars")
})

api.get("/options", async ctx => {
  ctx.body = ctx.state.instance!.getVariableOptions()
})

api.route({
  method: "PATCH",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object(
      Object.fromEntries([
        ...Instance.VAR_SETTER_BF3,
        ...Instance.VAR_SETTER_VU,
        ...Instance.VAR_SETTER_VU
      ].map(k => [k, Joi.alternatives(Joi.string().allow(""), Joi.number(), Joi.boolean()).optional()]
      ))
    ).required()
  },
  pre: perm(VariableScope.MODIFY),
  handler: async ctx => {
    const { instance } = ctx.state
    await Promise.all(
      Object.keys(ctx.request.body!)
        .map(k => instance!.updateVariable(k, ctx.request.body[k]))
    )
    ctx.body = instance!.state.get("vars")
  }
})

export default api
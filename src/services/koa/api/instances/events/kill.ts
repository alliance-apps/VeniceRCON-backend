import Router from "koa-joi-router"

const api = Router()
const { Joi } = Router

api.route({
  method: "GET",
  path: "/",
  validate: {
    query: Joi.object({
      count: Joi.number().default(50).optional(),
      from: Joi.date().optional()
    })
  },
  handler: async ctx => {
    const { count, from } = ctx.request.query
    ctx.body = await Promise.all((await ctx.state.instance!.kill.getFeed(count, from)).map(kill => kill.toJSON()))
  }
})


export default api
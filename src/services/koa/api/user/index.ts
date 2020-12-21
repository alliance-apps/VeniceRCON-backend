import { User } from "@entity/User"
import { perm } from "@service/koa/permission"
import { UserScope } from "@service/permissions/Scopes"
import Router from "koa-joi-router"
import userRouter from "./user"

const api = Router()
const { Joi } = Router

api.get("/", async ctx => {
  ctx.body = await User.getUsersAndPermissions()
})

//creates a new user
api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      username: Joi.string().min(3).required(),
      password: Joi.string().min(6).required()
    }).required()
  },
  pre: perm(UserScope.CREATE),
  handler: async ctx => {
    const { username, password } = ctx.request.body
    if (await User.findOne({ username })) {
      ctx.body = { message: "username is already taken" }
      return ctx.status = 400
    }
    const user = await User.from({ username, password })
    ctx.body = await user.getUserAndPermissions()
  }
})

api.param("userId", async (id, ctx, next) => {
  const userId = parseInt(id, 10)
  if (isNaN(userId) || userId <= 0) {
    ctx.body = { message: "invalid userId provided, expected positive number" }
    return ctx.status = 400
  }
  const user = await User.findOne({ id: userId })
  if (!user) return ctx.status = 404
  ctx.state.user = user
  await next()
})

api.use("/:userId", userRouter.middleware())

export default api
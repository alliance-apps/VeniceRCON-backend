import { User } from "@entity/User"
import Router from "koa-joi-router"
import userRouter from "./user"

const api = Router()

api.get("/", async ctx => {
  ctx.body = await User.getUsersAndPermissions()
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
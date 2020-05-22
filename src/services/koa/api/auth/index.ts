import Router from "koa-joi-router"
import { User } from "@entity/User"
import { createToken } from "@service/koa/jwt"

const { Joi } = Router
const router = Router()

router.route({
  method: "POST",
  path: "/login",
  validate: {
    type: "json",
    body: Joi.object({
      username: Joi.string(),
      password: Joi.string()
    })
  },
  handler: async ({ request, response }) => {
    const user = await User.findOne({ username: request.body.username })
    if (!user || !(await user.validatePassword(request.body.password))) {
      response.status = 400
      response.body = { message: "invalid username or password" }
      return
    }
    response.body = { token: await createToken({ user }) }
  }
})

export default router
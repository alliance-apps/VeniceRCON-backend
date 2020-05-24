import Router from "koa-joi-router"
import { User } from "@entity/User"
import { createToken } from "@service/koa/jwt"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"

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

router.get("/whoami", async ctx => {
  if (!ctx.state.token) return ctx.status = 401
  const repository = getCustomRepository(PermissionRepository)
  ctx.body = {
    permissions: (await repository.getPermissions(ctx.state.token.id))
      .map(p => ({ instance: p.instanceId, root: p.root, permission: p.mask })),
    token: ctx.state.token
  }
})

export default router
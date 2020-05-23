import { Permission } from "@entity/Permission"
import { Context, Next } from "koa"
import koaJwt from "koa-jwt"
import { getSecret } from "./jwt"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { FullHandler } from "koa-joi-router"

let secret: string

export async function initialize() {
  secret = await getSecret()
}

export function jwt(opts: Partial<koaJwt.Options> = {}) {
  return koaJwt({ ...opts, secret, key: "token" })
}

/**
 * checks if a user has a specific permission for the currently selected instance
 * @param perm at least one permission a user should have
 */
export function perm(perm: Permission.Type|Permission.Type[]): FullHandler {
  return async (ctx: Context, next: Next): Promise<any> => {
    const { token, instance } = ctx.state
    if (!token) return ctx.status = 401
    if (!ctx.state.permissions) {
      ctx.state.permissions = await getCustomRepository(PermissionRepository).getPermissions(token.id)
    }
    const permissions: Permission.Type[] = Array.isArray(perm) ? perm : [perm]
    if (!(await ctx.state.getUserPermissions())
      .filter(p => p.root || !instance || p.instanceId === instance.container.id)
      .some(p => permissions.some(perm => p.hasPermission(perm)))
    ) return ctx.status = 401
    await next()
  }
}
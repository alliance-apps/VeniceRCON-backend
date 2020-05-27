import { Context, Next } from "koa"
import { FullHandler } from "koa-joi-router"
import { permissionManager } from "@service/permissions"
import { Scopes } from "@service/permissions/Scopes"

/**
 * checks if a user has a specific permission for the currently selected instance
 * @param scope at least one permission a user should have
 */
export function perm(scope: Scopes): FullHandler {
  return async (ctx: Context, next: Next): Promise<any> => {
    const { token, instance } = ctx.state
    if (!token) return ctx.status = 401
    const ok = await permissionManager.hasPermission({
      instance: instance === undefined || instance.id, scope, user: token.id
    })
    if (!ok) return ctx.status = 401
    await next()
  }
}
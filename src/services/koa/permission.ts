import { Context, Next } from "koa"
import { FullHandler } from "koa-joi-router"
import { permissionManager } from "@service/permissions"

/**
 * checks if a user has a specific permission for the currently selected instance
 * @param scope at least one permission a user should have
 */
export function perm(scope: bigint): FullHandler {
  return async (ctx: Context, next: Next): Promise<any> => {
    const { token, instance } = ctx.state
    if (!token) return ctx.status = 401
    const ok = await permissionManager.hasPermissions({
      instance: instance === undefined || instance.id, scope, user: token.id
    })
    if (!ok) return ctx.status = 401
    await next()
  }
}
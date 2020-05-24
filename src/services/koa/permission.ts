import { Permission } from "@entity/Permission"
import { Context, Next } from "koa"
import { FullHandler } from "koa-joi-router"


/**
 * checks if a user has a specific permission for the currently selected instance
 * @param perm at least one permission a user should have
 */
export function perm(perm: Permission.Type|Permission.Type[]): FullHandler {
  return async (ctx: Context, next: Next): Promise<any> => {
    const { token, instance } = ctx.state
    if (!token) return ctx.status = 401
    const permissions: Permission.Type[] = Array.isArray(perm) ? perm : [perm]
    if (!(await ctx.state.getUserPermissions())
      .filter(p => p.root || !instance || p.instanceId === instance.container.id)
      .some(p => permissions.some(perm => p.hasPermission(perm)))
    ) return ctx.status = 401
    await next()
  }
}
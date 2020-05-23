import { Context, Next } from "koa"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"

export async function stateDefaults(ctx: Context, next: Next) {
  const { state } = ctx
  state.getUserPermissions = () => {
    if (!state.token) return Promise.resolve([])
    if (!(state._permissions instanceof Promise))
      state._permissions = getCustomRepository(PermissionRepository).getPermissions(state.token.id)
    return state._permissions
  }
  await next()
}
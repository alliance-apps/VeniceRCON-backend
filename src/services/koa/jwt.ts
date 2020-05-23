import jwt from "jsonwebtoken"
import { User } from "@entity/User"
import { Config } from "@entity/Config"
import { PermissionRepository } from "@repository/PermissionRepository"
import { getCustomRepository } from "typeorm"

/**
 * creates a new token from given properties
 * @param props properties to create the token for
 */
export async function createToken(props: CreateTokenProps) {
  const token: Partial<JsonWebToken> = {
    id: props.user.id,
    username: props.user.username
  }
  token.permissions = (await getCustomRepository(PermissionRepository).getPermissions(props.user))
    .map(p => ({ instance: p.instanceId, root: p.root, permission: p.mask }))
  return jwt.sign(token, await getSecret())
}

/** retrieves the secret */
export async function getSecret() {
  const secret = await Config.findOne({ name: "secret" })
  if (!secret) throw new Error("could not find config entry secret")
  return secret.value
}


export interface CreateTokenProps {
  user: User
}

export interface JsonWebToken {
  id: number
  username: string
  permissions?: {
    instance?: number,
    root: boolean,
    permission: string
  }[]
}
import jwt from "jsonwebtoken"
import { User } from "@entity/User"
import { Config } from "@entity/Config"
import { PermissionRepository } from "@repository/PermissionRepository"
import { getCustomRepository } from "typeorm"
import koaJwt from "koa-jwt"


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

/** retrieves the secret to sign the auth token */
export async function getSecret() {
  const secret = await Config.findOne({ name: "secret" })
  if (!secret) throw new Error("could not find config entry secret")
  return secret.value
}

/**
 * creates a jwt middleware with options override
 * @param opts 
 */
export async function jwtMiddleware(opts: Partial<koaJwt.Options> = {}) {
  return koaJwt({ ...opts, secret: await getSecret(), key: "token" })
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
import jwt from "jsonwebtoken"
import { User } from "@entity/User"
import { Config } from "@entity/Config"

/**
 * creates a new token from given properties
 * @param props properties to create the token for
 */
export async function createToken(props: CreateTokenProps) {
  return jwt.sign({
    id: props.user.id,
    username: props.user.username,
    permissions: props.user.permissions
  } as JsonWebToken, await getSecret())
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
  permissions: number
}
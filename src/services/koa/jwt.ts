import jwt from "jsonwebtoken"
import { Config } from "@entity/Config"
import koaJwt from "koa-jwt"
import { config } from "@service/config"


/**
 * creates a new token from given properties
 * @param props properties to create the token for
 */
export async function createToken(props: CreateTokenProps) {
  const token: Partial<JsonWebToken> = {
    v: 1,
    id: props.user.id,
    username: props.user.username
  }
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
  return koaJwt({
    ...opts,
    secret: await getSecret(),
    key: "token",
    isRevoked: async (ctx, token: JsonWebToken) => {
      if (token.v !== 1) return true
      const { maxAge, sendRefresh } = config.webserver.jwt
      const now = Math.floor(Date.now() / 1000)
      if (token.iat < now - maxAge * 24 * 60 * 60) return true
      if (token.iat < now - sendRefresh * 24 * 60 * 60) {
        ctx.set("Authorization", `Bearer ${await createToken({
          user: { id: token.id, username: token.username }
        })}`)
      }
      return false
    }
  })
}


export interface CreateTokenProps {
  user: {
    id: number
    username: string
  }
}

export interface JsonWebToken {
  //version of the token
  v: number
  //user id
  id: number
  //username
  username: string
  //issued at
  iat: number
}
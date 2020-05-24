import { Instance } from "@service/battlefield/Instance"
import { JsonWebToken } from "@service/koa/jwt"

declare module "koa" {

  interface DefaultState {
    token?: JsonWebToken
    instance?: Instance
  }

}
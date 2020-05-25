import { Instance } from "@service/battlefield/Instance"
import { JsonWebToken } from "@service/koa/jwt"
import { Permission } from "@entity/Permission"

declare module "koa" {

  interface DefaultState {
    token?: JsonWebToken
    instance?: Instance
    permission?: Permission
  }

}
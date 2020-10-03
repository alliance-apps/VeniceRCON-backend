import { Joi } from "koa-joi-router"

export const schema = Joi.object({
  plugins: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    version: Joi.string().regex(/^\d+\.\d+\.\d+$/).required(),
    repository: Joi.string().required(),
    commit: Joi.string().required()
  })).required()
})

export interface PluginStoreSchema {
  plugins: PluginSchema[]
}

export interface PluginSchema {
  name: string,
  description: string,
  version: string,
  repository: string,
  commit: string
}
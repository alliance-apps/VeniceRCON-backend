import { Joi } from "koa-joi-router"

export const metaSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().optional(),
  version: Joi.string().regex(/^\d+\.\d+\.\d+$/).required(),
  backend: Joi.string().allow("VU", "BF3").required(),
  //language: Joi.string().allow("JS").required(),
  entry: Joi.string().required(),
  vars: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    type: Joi.string().allow("string", "number", "boolean").required(),
    default: Joi.any().required()
  })).optional()
})
import { Joi } from "koa-joi-router"

export const metaSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().optional(),
  version: Joi.string().regex(/^\d+\.\d+\.\d+$/).required(),
  backend: Joi.string().valid("VU", "BF3", "*").required(),
  entry: Joi.string().required(),
  dependency: Joi.array().items(Joi.string()).optional(),
  vars: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    type: Joi.string().valid("string", "number", "boolean").required(),
    default: Joi.any().required()
  })).optional()
})

export function checkVariableSchema(vars: PluginVariable[], data: Record<string, any>) {
  return Joi.validate(data, buildVariableSchema(vars))
}

function buildVariableSchema(vars: PluginVariable[]) {
  return Joi.object(Object.fromEntries(vars.map(v => {
    return [v.name, getVariableType(v.type)]
  })))
}

function getVariableType(type: "string"|"number"|"boolean") {
  switch(type) {
    case "string": return Joi.string().optional()
    case "number": return Joi.number().optional()
    case "boolean": return Joi.boolean().optional()
  }
}

export interface Meta {
  name: string
  description?: string
  version: string
  backend: "BF3"|"VU"|"*"
  entry: string
  dependency?: string[]
  vars?: PluginVariable[]
}

export type PluginVariable =
  PluginStringVariable |
  PluginNumberVariable |
  PluginBooleanVariable

export interface PluginBaseVariable {
  name: string
  description: string
}

export interface PluginStringVariable extends PluginBaseVariable {
  type: "string"
  default: string
}

export interface PluginNumberVariable extends PluginBaseVariable {
  type: "number"
  default: number
}

export interface PluginBooleanVariable extends PluginBaseVariable {
  type: "boolean"
  default: boolean
}
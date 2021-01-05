import { Joi } from "koa-joi-router"

const baseVarSchema = Joi.object({
  type: Joi.string().valid("string", "number", "boolean", "strings", "select", "array").required(),
  title: Joi.string().allow("").optional().default(""),
  name: Joi.string().required(),
  description: Joi.string().required(),
  conditions: Joi.array().items(
    Joi.object().pattern(/.*/, Joi.any())
  ).default([]).optional(),
  default: Joi.when("type", {
    switch: [
      { is: "string", then: Joi.string().allow("").default("").optional() },
      { is: "number", then: Joi.number().default(0).optional() },
      { is: "boolean", then: Joi.boolean().default(false).optional() },
      { is: "strings", then: Joi.array().items(Joi.string().allow("")).default([]).optional() },
      { is: "select", then: Joi.string().allow("").default("").optional() },
      { is: "array", then: Joi.array().default([]).optional() },
    ]
  }),
  //string
  multiline: Joi.when("type", { is: "string", then: Joi.boolean().default(false).optional() }),
  //number
  //boolean
  //strings
  //select
  options: Joi.when("type", { is: "select", then: Joi.object().pattern(/.*/, Joi.string()).required() }),
  //array
  vars: Joi.when("type", { is: "array", then: Joi.array().items(Joi.link("#baseVariableSchema")).required() }),
}).unknown(true).id("baseVariableSchema")

export const varSchema = Joi.array().items(baseVarSchema).default([]).optional()

export const metaSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().allow("").default("").optional(),
  version: Joi.string().regex(/^\d+\.\d+\.\d+$/).required(),
  author: Joi.string().optional().allow("").default(""),
  backend: Joi.string().valid("VU", "BF3", "*").insensitive().uppercase().required(),
  entry: Joi.string().required(),
  dependency: Joi.array().items(Joi.string()).optional().default([]),
  optionalDependency: Joi.array().items(Joi.string()).optional().default([]),
  vars: varSchema
}).unknown(true)

export function checkVariableSchema(vars: PluginVariable[], data: Record<string, any>) {
  return buildVariableSchema(vars).validateAsync(data)
}

function buildVariableSchema(vars: PluginVariable[]) {
  return Joi.object(Object.fromEntries(vars.map(meta => {
    return [meta.name, getVariableType(meta)]
  })))
}

function getVariableType(meta: PluginVariable): any {
  switch(meta.type) {
    case "string": return Joi.string().allow("").optional()
    case "number": return Joi.number().optional()
    case "boolean": return Joi.boolean().optional()
    case "strings": return Joi.array().items(Joi.string()).optional()
    case "array": return Joi.array().items(buildVariableSchema(meta.vars)).optional()
    case "select": return Joi.string().allow(...Object.keys(meta.options)).only().optional()
  }
}

export interface Meta {
  name: string
  description: string
  version: string
  author: string
  backend: "BF3"|"VU"|"*"
  entry: string
  dependency: string[]
  optionalDependency: string[]
  vars: PluginVariable[]
}

export interface Condition {
  key: string
  match: string|number|boolean
}

export type PluginVariable =
  PluginStringVariable |
  PluginNumberVariable |
  PluginBooleanVariable |
  PluginStringsVariable |
  PluginArrayVariable |
  PluginSelectVariable |
  PluginArrayVariable

export interface PluginBaseVariable {
  title: string
  name: string
  description: string
  conditions?: {
    [key: string]: string|number|boolean
  }[]
}

export interface PluginStringVariable extends PluginBaseVariable {
  type: "string"
  default?: string
  multiline?: boolean
}

export interface PluginNumberVariable extends PluginBaseVariable {
  type: "number"
  default?: number
}

export interface PluginBooleanVariable extends PluginBaseVariable {
  type: "boolean"
  default?: boolean
}

export interface PluginStringsVariable extends PluginBaseVariable {
  type: "strings"
  default?: string[]
}

export interface PluginSelectVariable extends PluginBaseVariable {
  type: "select"
  options: Record<string, string>
  default?: string
}

export interface PluginArrayVariable extends PluginBaseVariable {
  type: "array"
  vars: PluginVariable[]
  default?: []
}
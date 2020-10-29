import { Joi } from "koa-joi-router"

const baseVarSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  conditions: Joi.array().items(
    Joi.object().pattern(/.*/, [Joi.string().allow(""), Joi.number(), Joi.boolean()])
  ).default([]).optional()
})

/** allows simple strings */
export const stringSchema = baseVarSchema.keys({
  type: Joi.string().valid("string").required(),
  default: Joi.string().default("").optional(),
  multiline: Joi.boolean().default(false).optional()
})

/** allows integers and floats */
export const numberSchema = baseVarSchema.keys({
  type: Joi.string().valid("number").required(),
  default: Joi.number().default(0).optional()
})

/** allows true / false */
export const booleanSchema = baseVarSchema.keys({
  type: Joi.string().valid("boolean").required(),
  default: Joi.boolean().default(false).optional()
})

/** allows an array of strings */
export const stringsSchema = baseVarSchema.keys({
  type: Joi.string().valid("strings").required(),
  default: Joi.array().items(Joi.string()).default([]).optional()
})

/** allows multiple options */
export const selectSchema = baseVarSchema.keys({
  type: Joi.string().valid("select").required(),
  options: Joi.object().pattern(/.*/, Joi.string()).required(),
  default: Joi.array().items(Joi.string()).default("").optional()
})

const baseSchemas = [
  stringSchema,
  numberSchema,
  booleanSchema,
  stringsSchema,
  selectSchema
]


/** allows an array of strings */
export const arraySchema = baseVarSchema.keys({
  type: Joi.string().valid("array").required(),
  vars: Joi.array().items(...baseSchemas).required(),
  default: Joi.array().default([]).optional()
})

/** create schema early so it can be required a circular dependency */
export const varSchema = Joi.array()
  .items(...baseSchemas, arraySchema)
  .default([])
  .optional()

export const metaSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().optional(),
  version: Joi.string().regex(/^\d+\.\d+\.\d+$/).required(),
  backend: Joi.string().valid("VU", "BF3", "*").insensitive().uppercase().required(),
  entry: Joi.string().required(),
  dependency: Joi.array().items(Joi.string()).optional().default([]),
  vars: varSchema
})

export function checkVariableSchema(vars: PluginVariable[], data: Record<string, any>) {
  return Joi.validate(data, buildVariableSchema(vars))
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
    case "select": return Joi.string().only(Object.keys(meta.options)).optional()
  }
}

export interface Meta {
  name: string
  description?: string
  version: string
  backend: "BF3"|"VU"|"*"
  entry: string
  dependency: string[]
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
  PluginSelectVariable

export interface PluginBaseVariable {
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
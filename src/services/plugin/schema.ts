import { Joi } from "koa-joi-router"

const baseVarSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required()
})

/** allows simple strings */
export const stringSchema = baseVarSchema.keys({
  type: Joi.string().valid("string").required(),
  default: Joi.string().default("").optional()
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
  options: Joi.array().items(Joi.string()).required(),
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
  vars: Joi.array().items(...baseSchemas).required()
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
  return Joi.object(Object.fromEntries(vars.map(v => {
    return [v.name, getVariableType(v.type)]
  })))
}

function getVariableType(type: "string"|"number"|"boolean"|"strings"|"array"|"select") {
  switch(type) {
    case "string": return Joi.string().optional()
    case "number": return Joi.number().optional()
    case "boolean": return Joi.boolean().optional()
    case "strings": return Joi.array().items(Joi.string()).optional()
    case "array": return Joi.array().optional()
    case "select": return Joi.string().optional()
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

export interface PluginStringsVariable extends PluginBaseVariable {
  type: "strings"
  default: string[]
}

export interface PluginSelectVariable extends PluginBaseVariable {
  type: "select"
  options: string[]
  default: string
}

export interface PluginArrayVariable extends PluginBaseVariable {
  type: "array"
  vars: PluginVariable[]
}
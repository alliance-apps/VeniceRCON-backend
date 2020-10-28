import { Meta, metaSchema, PluginVariable, varSchema } from "../../src/services/plugin/schema"

const schema = (meta: Partial<Meta> = {}): Meta => ({
  name: "example",
  description: "description of example",
  version: "1.0.0",
  backend: "*",
  entry: "index.js",
  dependency: [],
  vars: [],
  ...meta
})

describe("MetaSchema", () => {

  it("should validate a basic schema successfully", async () => {
    expect.assertions(1)
    const data = schema()
    //@ts-ignore
    delete data.dependency
    //@ts-ignore
    delete data.vars
    expect(await metaSchema.validate(schema())).toEqual(schema())
  })

  describe("schema.backend", () => {
    it("should validate case insensitive", async () => {
      expect.assertions(1)
      //@ts-expect-error
      expect(await metaSchema.validate(schema({ backend: "vu" })))
        .toEqual(schema({ backend: "VU" }))
    })

    it("should error on invalid value", async () => {
      expect.assertions(1)
      try {
        //@ts-expect-error
        await metaSchema.validate(schema({ backend: "invalid" }))
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })

  describe("schema.vars", () => {

    const vars = (type: any, data: Partial<PluginVariable> = {}): [PluginVariable] => ([{
      name: "foo",
      description: "description of foo",
      type,
      ...data
    }] as [PluginVariable])

    it("should validate a string schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validate(vars("string")))
        .toEqual(vars("string", { default: "" }))
    })

    it("should validate a number schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validate(vars("number")))
        .toEqual(vars("number", { default: 0 }))
    })

    it("should validate a boolean schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validate(vars("boolean")))
        .toEqual(vars("boolean", { default: false }))
    })

    it("should validate a strings schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validate(vars("strings")))
        .toEqual(vars("strings", { default: [] as any }))
    })

    it("should validate a select schema", async () => {
      expect.assertions(1)
      const schema = vars("select", { options: ["foo", "bar"] })
      expect(await varSchema.validate(schema))
        .toEqual(vars("select", { default: "", options: ["foo", "bar"] }))
    })

    it("should validate a nested array schema", async () => {
      expect.assertions(1)
      const schema = vars("array", {
        vars: vars("string")
      })
      expect(await varSchema.validate(schema))
        .toEqual([{
          name: "foo",
          description: "description of foo",
          type: "array",
          default: [],
          vars: [{
            name: "foo",
            description: "description of foo",
            type: "string",
            default: ""
          }]
        }])
    })
  })
})
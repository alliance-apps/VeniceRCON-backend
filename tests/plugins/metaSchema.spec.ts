import {
  Meta,
  metaSchema,
  PluginVariable,
  varSchema,
  checkVariableSchema
} from "../../src/services/plugin/schema"

const schema = (meta: Partial<Meta> = {}): Meta => ({
  name: "example",
  description: "description of example",
  version: "1.0.0",
  author: "foobar",
  backend: "*",
  entry: "index.js",
  dependency: [],
  optionalDependency: [],
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
    expect(await metaSchema.validateAsync(schema())).toEqual(schema())
  })

  describe("schema.backend", () => {
    it("should validate case insensitive", async () => {
      expect.assertions(1)
      //@ts-expect-error
      expect(await metaSchema.validateAsync(schema({ backend: "vu" })))
        .toEqual(schema({ backend: "VU" }))
    })

    it("should error on invalid value", async () => {
      expect.assertions(1)
      try {
        //@ts-expect-error
        await metaSchema.validateAsync(schema({ backend: "invalid" }))
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })

  describe("schema.vars", () => {

    const vars = (type: any, data: Partial<PluginVariable> = {}): [PluginVariable] => ([{
      name: "foo",
      title: "",
      description: "description of foo",
      indent: 0,
      type,
      conditions: [],
      ...data
    }] as [PluginVariable])

    it("should validate a string schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validateAsync(vars("string")))
        .toEqual(vars("string", { default: "", multiline: false }))
    })

    it("should validate a number schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validateAsync(vars("number")))
        .toEqual(vars("number", { default: 0 }))
    })

    it("should validate a boolean schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validateAsync(vars("boolean")))
        .toEqual(vars("boolean", { default: false }))
    })

    it("should validate a strings schema", async () => {
      expect.assertions(1)
      expect(await varSchema.validateAsync(vars("strings")))
        .toEqual(vars("strings", { default: [] as any }))
    })

    it("should validate a select schema", async () => {
      expect.assertions(1)
      const schema = vars("select", { options: { foo: "fooKey", bar: "barKey" } })
      expect(await varSchema.validateAsync(schema))
        .toEqual(vars("select", { default: "", options: { foo: "fooKey", bar: "barKey" } }))
    })

    it("should validate a nested array schema", async () => {
      expect.assertions(1)
      const schema = vars("array", {
        vars: vars("string")
      })
      expect(await varSchema.validateAsync(schema))
        .toEqual([{
          title: "",
          name: "foo",
          indent: 0,
          description: "description of foo",
          type: "array",
          default: [],
          conditions: [],
          vars: [{
            title: "",
            name: "foo",
            indent: 0,
            description: "description of foo",
            type: "string",
            multiline: false,
            default: "",
            conditions: []
          }]
        }])
    })
  })

  describe("validate variables updates", () => {
    const varSchema = (): PluginVariable[] => ([{
      name: "fooString",
      title: "foo string title",
      indent: 0,
      description: "",
      type: "string",
      multiline: false,
      default: "default"
    }, {
      name: "fooNumber",
      title: "foo number title",
      indent: 0,
      description: "",
      type: "number",
      default: 123
    }, {
      name: "fooBoolean",
      title: "foo boolean title",
      indent: 0,
      description: "",
      type: "boolean",
      default: true
    }, {
      name: "fooStrings",
      title: "foo strings title",
      indent: 0,
      description: "",
      type: "strings",
      default: ["foo", "bar"]
    }, {
      name: "fooSelect",
      title: "foo select title",
      indent: 0,
      description: "",
      type: "select",
      options: {
        "fooKey": "some fooKey descriptor",
        "barKey": "some barKey descriptor",
        "bazKey": "some bazKey descriptor"
      },
      default: "baz"
    }])

    const variables = () => ({
      fooString: "bar",
      fooNumber: 123,
      fooBoolean: true,
      fooStrings: ["some", "strings"],
      fooSelect: "barKey"
    })

    it("should successfully validate various types of variables", async () => {
      expect.assertions(1)
      expect(await checkVariableSchema(varSchema(), variables()))
        .toEqual(variables())
    })

    it("should validate empty strings", async () => {
      expect.assertions(1)
      expect(await checkVariableSchema(varSchema(), { fooString: "" }))
        .toEqual({ fooString: "" })
    })

    it("should disallow wrong select option", async () => {
      expect.assertions(1)
      try {
        await checkVariableSchema(varSchema(), { fooSelect: "invalid" })
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })

    it("should validate a nested array", async () => {
      expect.assertions(1)
      const result = { fooArray: [{ bar: "baz" }, { bar: "foo" }] }
      expect(await checkVariableSchema([{
        title: "foo title",
        name: "fooArray",
        description: "descriptor",
        indent: 0,
        type: "array",
        vars: [{
          name: "bar",
          title: "bar title",
          indent: 0,
          description: "descriptor",
          type: "string"
        }]
      }], result)).toEqual(result)
    })


  })
})
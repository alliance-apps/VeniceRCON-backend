import { StateService } from "../../src/services/container/manager/state/StateService"

const { Type } = StateService

describe("StateService", () => {

  it("should check if a boolean state gets initialized correctly", () => {
    const state = new StateService({
      state: {
        foo: { type: Type.BOOLEAN },
        baz: { type: Type.BOOLEAN, default: true }
      }
    })
    expect(state.get()).toEqual({ foo: false, baz: true })
  })

  it("should check if a numeric state gets initialized correctly", () => {
    const state = new StateService({
      state: {
        foo: { type: Type.NUMBER },
        baz: { type: Type.NUMBER, default: 13 }
      }
    })
    expect(state.get()).toEqual({ foo: 0, baz: 13 })
  })

  it("should check if a string state gets initialized correctly", () => {
    const state = new StateService({
      state: {
        foo: { type: Type.STRING },
        baz: { type: Type.STRING, default: "baz" }
      }
    })
    expect(state.get()).toEqual({ foo: "", baz: "baz" })
  })

  it("should check if an array state gets initialized correctly", () => {
    const state = new StateService({
      state: {
        foo: {
          type: Type.ARRAY,
          state: { type: Type.BOOLEAN }
        },
        baz: {
          type: Type.ARRAY,
          default: [false],
          state: { type: Type.BOOLEAN }
        }
      }
    })
    expect(state.get()).toEqual({ foo: [], baz: [false] })
  })

  it("should check if an object state gets initialized correctly", () => {
    const state = new StateService({
      state: {
        foo: {
          type: Type.OBJECT,
          state: {
            fooKey: { type: Type.STRING },
            barKey: { type: Type.NUMBER }
          }
        }
      }
    })
    expect(state.get()).toEqual({ foo: { fooKey: "", barKey: 0 } })
  })

})
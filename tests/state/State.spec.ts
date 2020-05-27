import { State } from "../../src/services/container/manager/State"

describe("State", () => {

  it("should check if the state gets updated correctly", () => {
    const state = new State<{ foo: string, bar: number }>({ foo: "123", bar: 123 })
    expect(state.getState()).toEqual({ foo: "123", bar: 123 })
    expect(state.update({ foo: "456", bar: 123 }))
      .toEqual([["foo", "456"]])
    expect(state.getState()).toEqual({ foo: "456", bar: 123 })
  })

  it("should check if a nested state gets updated correctly", () => {
    const state = new State<{ foo: { x: number, y: number }, bar: number }>({ foo: { x: 0, y: 1 }, bar: 0 })
    expect(state.getState()).toEqual({ foo: { x: 0, y: 1 }, bar: 0 })
    expect(state.update({ foo: { x: 0, y: 2 }, bar: 2 }))
      .toEqual([["foo.y", 2], ["bar", 2]])
    expect(state.getState()).toEqual({ foo: { x: 0, y: 2 }, bar: 2 })
  })

  it("should check if an array gets updated correclty", () => {
    const state = new State<{ foo: number[] }>({ foo: [0, 1, 2] })
    expect(state.getState()).toEqual({ foo: [0, 1, 2] })
    expect(state.update({ foo: [1, 2, 3] }))
      .toEqual([["foo", [1, 2, 3]]])
    expect(state.getState()).toEqual({ foo: [1, 2, 3] })
  })

})
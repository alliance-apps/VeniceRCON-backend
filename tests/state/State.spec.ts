import { State } from "../../src/services/container/manager/state/State"

describe("State", () => {

  it("should check if the state gets updated correctly", () => {
    const state = new State()
    state.addProperty("foo", State.Type.BOOLEAN)
    state.addProperty("bar", State.Type.STRING)
    expect(state.getState()).toEqual({ foo: false, bar: "" })
  })

})
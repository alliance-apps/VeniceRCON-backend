"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const State_1 = require("../../src/services/container/manager/State");
describe("State", () => {
    it("should check if the state gets updated correctly", () => {
        const state = new State_1.State({ foo: "123", bar: 123 });
        expect(state.getState()).toEqual({ foo: "123", bar: 123 });
        expect(state.update({ foo: "456", bar: 123 }))
            .toEqual([["foo", "456"]]);
        expect(state.getState()).toEqual({ foo: "456", bar: 123 });
    });
    it("should check if a nested state gets updated correctly", () => {
        const state = new State_1.State({ foo: { x: 0, y: 1 }, bar: 0 });
        expect(state.getState()).toEqual({ foo: { x: 0, y: 1 }, bar: 0 });
        expect(state.update({ foo: { x: 0, y: 2 }, bar: 2 }))
            .toEqual([["foo.y", 2], ["bar", 2]]);
        expect(state.getState()).toEqual({ foo: { x: 0, y: 2 }, bar: 2 });
    });
    it("should check if an array gets updated correctly", () => {
        const state = new State_1.State({ foo: [0, 1, 2] });
        expect(state.getState()).toEqual({ foo: [0, 1, 2] });
        expect(state.update({ foo: [1, 2, 3] }))
            .toEqual([["foo", [1, 2, 3]]]);
        expect(state.getState()).toEqual({ foo: [1, 2, 3] });
    });
    it("should check if a dynamic object gets updated correctly", () => {
        const state = new State_1.State({ foo: {} });
        expect(state.getState()).toEqual({ foo: {} });
        expect(state.update({ foo: { bar: { a: 1, b: 2 } } }))
            .toEqual([["foo.bar.a", 1], ["foo.bar.b", 2]]);
        expect(state.getState()).toEqual({ foo: { bar: { a: 1, b: 2 } } });
        expect(state.update({ foo: { baz: { a: 3, b: 4 }, bar: undefined } }))
            .toEqual([["foo.baz.a", 3], ["foo.baz.b", 4], ["foo.bar", undefined]]);
        expect(state.getState()).toEqual({ foo: { baz: { a: 3, b: 4 } } });
    });
});

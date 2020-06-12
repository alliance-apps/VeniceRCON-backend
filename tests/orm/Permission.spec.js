"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("../../src/services/config/index.ts", () => ({ config: { instance: { syncInterval: 1000 } } }));
const Permission_1 = require("@entity/Permission");
const Scopes_1 = require("@service/permissions/Scopes");
describe("Permission", () => {
    describe("check if the mask gets set correctly", () => {
        let permission;
        beforeEach(() => {
            permission = new Permission_1.Permission();
            permission.mask = "00";
        });
        it("should set an instance permission", () => {
            permission.setPermission(Scopes_1.InstanceScope.CREATE, false);
            expect(permission.hasPermission(Scopes_1.InstanceScope.CREATE)).toBe(true);
            expect(permission.hasPermission(Scopes_1.InstanceScope.DELETE)).toBe(false);
            expect(permission.hasPermission(Scopes_1.InstanceScope.UPDATE)).toBe(false);
        });
        it("should set a user permission", () => {
            permission.setPermission(Scopes_1.InstanceUserScope.UPDATE, false);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.UPDATE)).toBe(true);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.REMOVE)).toBe(false);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.CREATE)).toBe(false);
        });
        it("should set multiple permissions", () => {
            permission.setPermission(Scopes_1.InstanceUserScope.UPDATE, false);
            permission.setPermission(Scopes_1.InstanceUserScope.REMOVE, false);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.UPDATE)).toBe(true);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.REMOVE)).toBe(true);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.CREATE)).toBe(false);
        });
        it("should validate that the mask is correct", () => {
            permission.setPermission(Scopes_1.InstanceUserScope.CREATE, false);
            permission.setPermission(Scopes_1.InstanceUserScope.REMOVE, false);
            permission.delPermission(Scopes_1.InstanceUserScope.REMOVE, false);
            expect(permission.mask).toBe("00:02");
        });
        it("should validate that the mask gets reseted correctly", () => {
            permission.setPermission(Scopes_1.InstanceUserScope.CREATE, false);
            permission.setPermission(Scopes_1.InstanceUserScope.REMOVE, false);
            permission.setPermission(Scopes_1.InstanceUserScope.UPDATE, false);
            permission.delPermission(Scopes_1.InstanceUserScope.REMOVE, false);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.CREATE)).toBe(true);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.REMOVE)).toBe(false);
            expect(permission.hasPermission(Scopes_1.InstanceUserScope.UPDATE)).toBe(true);
        });
    });
});

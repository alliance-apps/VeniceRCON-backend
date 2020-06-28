jest.mock("../../src/services/config/index.ts", () => ({ config: { instance: { syncInterval: 1000 } } }))

import { Permission } from "../../src/services/orm/entity/Permission"
import { InstanceScope, InstanceUserScope } from "../../src/services/permissions/Scopes"

describe("Permission", () => {


  describe("check if the mask gets set correctly", () => {
    let permission: Permission

    beforeEach(() => {
      permission = new Permission()
      permission.mask = "00"
    })

    it("should set an instance permission", () => {
      permission.setPermission(InstanceScope.CREATE, false)
      expect(permission.hasPermission(InstanceScope.CREATE)).toBe(true)
      expect(permission.hasPermission(InstanceScope.DELETE)).toBe(false)
      expect(permission.hasPermission(InstanceScope.UPDATE)).toBe(false)
    })

    it("should set a user permission", () => {
      permission.setPermission(InstanceUserScope.UPDATE, false)
      expect(permission.hasPermission(InstanceUserScope.UPDATE)).toBe(true)
      expect(permission.hasPermission(InstanceUserScope.REMOVE)).toBe(false)
      expect(permission.hasPermission(InstanceUserScope.CREATE)).toBe(false)
    })

    it("should set multiple permissions", () => {
      permission.setPermission(InstanceUserScope.UPDATE, false)
      permission.setPermission(InstanceUserScope.REMOVE, false)
      expect(permission.hasPermission(InstanceUserScope.UPDATE)).toBe(true)
      expect(permission.hasPermission(InstanceUserScope.REMOVE)).toBe(true)
      expect(permission.hasPermission(InstanceUserScope.CREATE)).toBe(false)
    })

    it("should validate that the mask is correct", () => {
      permission.setPermission(InstanceUserScope.CREATE, false)
      permission.setPermission(InstanceUserScope.REMOVE, false)
      permission.delPermission(InstanceUserScope.REMOVE, false)
      expect(permission.mask).toBe("00:02")
    })

    it("should validate that the mask gets reseted correctly", () => {
      permission.setPermission(InstanceUserScope.CREATE, false)
      permission.setPermission(InstanceUserScope.REMOVE, false)
      permission.setPermission(InstanceUserScope.UPDATE, false)
      permission.delPermission(InstanceUserScope.REMOVE, false)
      expect(permission.hasPermission(InstanceUserScope.CREATE)).toBe(true)
      expect(permission.hasPermission(InstanceUserScope.REMOVE)).toBe(false)
      expect(permission.hasPermission(InstanceUserScope.UPDATE)).toBe(true)
    })
  })

})
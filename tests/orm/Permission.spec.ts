jest.mock("../../src/services/config/index.ts", () => ({ config: { instance: { syncInterval: 1000 } } }))

import { Permission } from "../../src/services/orm/entity/Permission"
import { InstanceScope, InstanceUserScope } from "../../src/services/permissions/Scopes"

describe("Permission", () => {


  describe("check if the mask gets set correctly", () => {
    let permission: Permission

    beforeEach(() => {
      permission = new Permission()
      //@ts-ignore
      permission.mask = 0n
    })

    it("should set an instance permission", () => {
      permission.addPermissions(InstanceScope.CREATE)
      expect(permission.hasPermissions(InstanceScope.CREATE)).toBe(true)
      expect(permission.hasPermissions(InstanceScope.DELETE)).toBe(false)
      expect(permission.hasPermissions(InstanceScope.UPDATE)).toBe(false)
    })

    it("should set a user permission", () => {
      permission.addPermissions(InstanceUserScope.UPDATE)
      expect(permission.hasPermissions(InstanceUserScope.UPDATE)).toBe(true)
      expect(permission.hasPermissions(InstanceUserScope.REMOVE)).toBe(false)
      expect(permission.hasPermissions(InstanceUserScope.CREATE)).toBe(false)
    })

    it("should set multiple permissions", () => {
      permission.addPermissions(InstanceUserScope.UPDATE)
      permission.addPermissions(InstanceUserScope.REMOVE)
      expect(permission.hasPermissions(InstanceUserScope.UPDATE)).toBe(true)
      expect(permission.hasPermissions(InstanceUserScope.REMOVE)).toBe(true)
      expect(permission.hasPermissions(InstanceUserScope.CREATE)).toBe(false)
    })

    it("should validate that the mask is correct", () => {
      permission.addPermissions(InstanceUserScope.CREATE)
      permission.addPermissions(InstanceUserScope.REMOVE)
      permission.delPermissions(InstanceUserScope.REMOVE)
      expect(permission.mask).toBe(InstanceUserScope.CREATE)
    })

    it("should validate that the mask gets reseted correctly", () => {
      permission.addPermissions(InstanceUserScope.CREATE)
      permission.addPermissions(InstanceUserScope.REMOVE)
      permission.addPermissions(InstanceUserScope.UPDATE)
      permission.delPermissions(InstanceUserScope.REMOVE)
      expect(permission.hasPermissions(InstanceUserScope.CREATE)).toBe(true)
      expect(permission.hasPermissions(InstanceUserScope.REMOVE)).toBe(false)
      expect(permission.hasPermissions(InstanceUserScope.UPDATE)).toBe(true)
    })
  })

})
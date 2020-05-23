import { Permission } from "../../src/services/orm/entity/Permission"

describe("Permission", () => {


  describe("check if the mask gets set correctly", () => {
    let permission: Permission
  
    beforeEach(() => {
      permission = new Permission()
      permission.mask = "0"
    })

    it("should set an instance permission", () => {
      permission.setPermission(Permission.Instance.CREATE)
      expect(permission.hasPermission(Permission.Instance.CREATE)).toBe(true)
      expect(permission.hasPermission(Permission.Instance.DELETE)).toBe(false)
      expect(permission.hasPermission(Permission.Instance.UPDATE)).toBe(false)
    })

    it("should set a user permission", () => {
      permission.setPermission(Permission.User.UPDATE)
      expect(permission.hasPermission(Permission.User.UPDATE)).toBe(true)
      expect(permission.hasPermission(Permission.User.REMOVE)).toBe(false)
      expect(permission.hasPermission(Permission.User.ADD)).toBe(false)
    })

    it("should set multiple permissions", () => {
      permission.setPermission(Permission.User.UPDATE)
      permission.setPermission(Permission.User.REMOVE)
      expect(permission.hasPermission(Permission.User.UPDATE)).toBe(true)
      expect(permission.hasPermission(Permission.User.REMOVE)).toBe(true)
      expect(permission.hasPermission(Permission.User.ADD)).toBe(false)
    })

    it("should validate that the mask is correct", () => {
      permission.setPermission(Permission.User.ADD)
      permission.setPermission(Permission.User.REMOVE)
      permission.delPermission(Permission.User.REMOVE)
      expect(permission.mask).toBe("00:01")
    })

    it("should validate that the mask gets reseted correctly", () => {
      permission.setPermission(Permission.User.ADD)
      permission.setPermission(Permission.User.REMOVE)
      permission.setPermission(Permission.User.UPDATE)
      permission.delPermission(Permission.User.REMOVE)
      expect(permission.hasPermission(Permission.User.ADD)).toBe(true)
      expect(permission.hasPermission(Permission.User.REMOVE)).toBe(false)
      expect(permission.hasPermission(Permission.User.UPDATE)).toBe(true)
    })
  })

})
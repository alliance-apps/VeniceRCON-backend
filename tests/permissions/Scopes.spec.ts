import {
  getBitMaskFromScopes,
  PluginScope,
  InstanceScope,
  getBitMaskWithAllPermissions,
  hasPermissions,
  InstanceUserScope,
  BanScope,
  PlayerScope,
  MapScope,
  ReservedSlotScope,
  VariableScope,
  EventScope,
  ModScope
} from "../../src/services/permissions/Scopes"

describe("Scopes", () => {

  it("should check if the bitmask gets set correctly", () => {
    const scopes = ["INSTANCE#ACCESS", "INSTANCE#CREATE", "PLUGIN#ACCESS"]
    expect(getBitMaskFromScopes(scopes))
      .toBe(InstanceScope.ACCESS | InstanceScope.CREATE | PluginScope.ACCESS)
  })

  it("should check if the mask for admin gets set correctly", () => {
    const mask = getBitMaskWithAllPermissions()
    expect(hasPermissions(
      mask, InstanceScope.ACCESS | InstanceScope.CREATE | InstanceScope.DELETE | InstanceScope.LOGS | InstanceScope.UPDATE
    )).toBeTruthy()
    expect(hasPermissions(
      mask, InstanceUserScope.ACCESS | InstanceUserScope.CREATE | InstanceUserScope.UPDATE | InstanceUserScope.REMOVE
    )).toBeTruthy()
    expect(hasPermissions(
      mask, BanScope.ACCESS | BanScope.CREATE | BanScope.DELETE
    )).toBeTruthy()
    expect(hasPermissions(
      mask, PlayerScope.KILL | PlayerScope.KICK | PlayerScope.MESSAGE | PlayerScope.MOVE
    )).toBeTruthy()
    expect(hasPermissions(
      mask, MapScope.SWITCH | MapScope.MANAGE
    )).toBeTruthy()
    expect(hasPermissions(
      mask, ReservedSlotScope.ACCESS | ReservedSlotScope.CREATE | ReservedSlotScope.DELETE
    )).toBeTruthy()
    expect(hasPermissions(
      mask, PluginScope.ACCESS | PluginScope.MODIFY
    )).toBeTruthy()
    expect(hasPermissions(
      mask, VariableScope.MODIFY
    )).toBeTruthy()
    expect(hasPermissions(
      mask, EventScope.CHAT | EventScope.KILL
    )).toBeTruthy()
    expect(hasPermissions(
      mask, ModScope.ACCESS | ModScope.CREATE | ModScope.UPDATE | ModScope.DELETE
    )).toBeTruthy()
  })
})
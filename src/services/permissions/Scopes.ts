export type Scopes =
  InstanceScope |
  InstanceUserScope |
  PlayerScope |
  BanScope |
  MapScope |
  ReservedSlotScope |
  PluginScope |
  VariableScope

export enum InstanceScope {
  ACCESS = 0x01,
  CREATE = 0x02,
  UPDATE = 0x04,
  DELETE = 0x08
}

export enum InstanceUserScope {
  ACCESS = 0x0100,
  CREATE = 0x0200,
  UPDATE = 0x0400,
  REMOVE = 0x0800
}

export enum BanScope {
  ACCESS = 0x010000,
  CREATE = 0x020000,
  DELETE = 0x040000
}

export enum PlayerScope {
  KILL = 0x01000000,
  KICK = 0x02000000,
  MESSAGE = 0x04000000,
  MOVE = 0x8000000
}

export enum MapScope {
  SWITCH = 0x0100000000,
  MANAGE = 0x0200000000
}

export enum ReservedSlotScope {
  ACCESS = 0x010000000000,
  CREATE = 0x020000000000,
  DELETE = 0x040000000000
}

export enum PluginScope {
  ACCESS = 0x01000000000000,
  MODIFY = 0x02000000000000
}

export enum VariableScope {
  MODIFY_BF3 = 0x0100000000000000,
  MODIFY_VU = 0x0200000000000000
}

const translation = {
  INSTANCE: InstanceScope,
  INSTANCEUSER: InstanceUserScope,
  PLAYER: PlayerScope,
  BAN: BanScope,
  MAP: MapScope,
  RESERVEDSLOT: ReservedSlotScope,
  VARIABLE: VariableScope
}

/** gets all available scope names */
export function getScopeNames() {
  return Object.keys(translation).map((k: any) => {
    //@ts-ignore
    return Object.values(translation[k])
      .filter(v => typeof v === "string")
      .map(v => `${k}#${v}`)
  }).flat(1)
}

/**
 * gets the mask for the bit from a name
 * @param name name of the bit to retrieve
 */
export function getBitFromName(name: string): Scopes {
  const [prefix, scope]: string[] = name.split("#")
  //@ts-ignore
  if (!translation[prefix] || !translation[prefix][scope]) return 0
  //@ts-ignore
  return translation[prefix][scope]
}

/**
 * checks if the mask has a specific permission
 * @param mask mask to check
 * @param scope permission to check
 */
export function hasPermission(mask: string, scope: Scopes) {
  const nodes = mask.split(":").map(hex => parseInt(hex, 16))
  let index = 0
  while (scope > 255) {
    index++
    scope = scope >>> 8
  }
  if (nodes.length < index) return false
  return (nodes[index] & scope) === scope
}

/**
 * gets an array of scope names from a mask
 * @param mask mask to retrieve scope names from
 */
export function getScopesFromMask(mask: string) {
  const scopes: string[] = []
  const validateScope = (prefix: string, e: any) => {
    return (val: Scopes) => {
      if (!hasPermission(mask, val)) return
      scopes.push(`${prefix}#${e[val]}`)
    }
  }
  Object.keys(translation).map(key => {
    switch(key) {
      case "INSTANCE":
        const instance = validateScope(key, InstanceScope)
        instance(InstanceScope.ACCESS)
        instance(InstanceScope.CREATE)
        instance(InstanceScope.DELETE)
        instance(InstanceScope.UPDATE)
        return
      case "INSTANCEUSER":
        const user = validateScope(key, InstanceUserScope)
        user(InstanceUserScope.ACCESS)
        user(InstanceUserScope.CREATE)
        user(InstanceUserScope.UPDATE)
        user(InstanceUserScope.REMOVE)
        return
      case "BAN":
        const ban = validateScope(key, BanScope)
        ban(BanScope.ACCESS)
        ban(BanScope.CREATE)
        ban(BanScope.DELETE)
        return
      case "PLAYER":
        const player = validateScope(key, PlayerScope)
        player(PlayerScope.KILL)
        player(PlayerScope.KICK)
        return
      case "MAP":
        const map = validateScope(key, MapScope)
        map(MapScope.SWITCH)
        map(MapScope.MANAGE)
        return
      case "RESERVEDSLOT":
        const reserved = validateScope(key, ReservedSlotScope)
        reserved(ReservedSlotScope.ACCESS)
        reserved(ReservedSlotScope.CREATE)
        reserved(ReservedSlotScope.DELETE)
        return
      case "PLUGIN":
        const plugin = validateScope(key, PluginScope)
        plugin(PluginScope.ACCESS)
        plugin(PluginScope.MODIFY)
        return
      case "VARIABLE":
        const vars = validateScope(key, VariableScope)
        vars(VariableScope.MODIFY_BF3)
        vars(VariableScope.MODIFY_VU)
        return
    }
  })
  return scopes
}
export type Scopes =
  typeof InstanceScope |
  typeof InstanceUserScope |
  typeof PlayerScope |
  typeof BanScope |
  typeof MapScope |
  typeof ReservedSlotScope |
  typeof PluginScope |
  typeof VariableScope

export const InstanceScope = {
  ACCESS: BigInt("0x01"),
  CREATE: BigInt("0x02"),
  UPDATE: BigInt("0x04"),
  DELETE: BigInt("0x08")
}

export const InstanceUserScope = {
  ACCESS: BigInt("0x0100"),
  CREATE: BigInt("0x0200"),
  UPDATE: BigInt("0x0400"),
  REMOVE: BigInt("0x0800")
}

export const BanScope = {
  ACCESS: BigInt("0x010000"),
  CREATE: BigInt("0x020000"),
  DELETE: BigInt("0x040000")
}

export const PlayerScope = {
  KILL: BigInt("0x01000000"),
  KICK: BigInt("0x02000000"),
  MESSAGE: BigInt("0x04000000"),
  MOVE: BigInt("0x8000000")
}

export const MapScope = {
  SWITCH: BigInt("0x0100000000"),
  MANAGE: BigInt("0x0200000000")
}

export const ReservedSlotScope = {
  ACCESS: BigInt("0x010000000000"),
  CREATE: BigInt("0x020000000000"),
  DELETE: BigInt("0x040000000000")
}

export const PluginScope = {
  ACCESS: BigInt("0x01000000000000"),
  MODIFY: BigInt("0x02000000000000")
}

export const VariableScope = {
  MODIFY_BF3: BigInt("0x0100000000000000"),
  MODIFY_VU: BigInt("0x0200000000000000")
}

const translation: Record<string, Scopes> = {
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
  return Object.keys(translation).map(k => {
    return Object.values(translation[k])
      .filter(v => typeof v === "string")
      .map(v => `${k}#${v}`)
  }).flat(1)
}

/**
 * gets the mask for the bit from a name
 * @param name name of the bit to retrieve
 */
export function getBitFromName(name: string): bigint {
  const [prefix, scope]: string[] = name.split("#")
  if (!prefix || !scope) throw new Error("invalid name provided")
  const obj = translation[prefix]
  if (!obj) return 0n
  const bit = obj[scope as keyof Scopes]
  if (!bit) return 0n
  return bit
}

/**
 * checks if the mask has a specific permission
 * @param mask mask to check
 * @param scope permission to check
 */
export function hasPermission(mask: string, scope: bigint) {
  const nodes = mask.split(":").map(hex => BigInt(hex))
  let index = 0
  while (scope > 255n) {
    index++
    scope = scope >> 8n
  }
  if (nodes.length - 1 < index) return false
  return (nodes[index] & scope) === scope
}

/**
 * gets an array of scope names from a mask
 * @param mask mask to retrieve scope names from
 */
export function getScopesFromMask(mask: string) {
  const scopes: string[] = []
  const validateScope = <T extends Scopes>(prefix: string, scope: T) => {
    return (key: keyof T) => {
      const bit = scope[key]
      if (!hasPermission(mask, <any>bit)) return
      scopes.push(`${prefix}#${key}`)
    }
  }
  Object.keys(translation).map(key => {
    switch(key) {
      case "INSTANCE":
        const instance = validateScope(key, InstanceScope)
        instance("ACCESS")
        instance("CREATE")
        instance("DELETE")
        instance("UPDATE")
        return
      case "INSTANCEUSER":
        const user = validateScope(key, InstanceUserScope)
        user("ACCESS")
        user("CREATE")
        user("UPDATE")
        user("REMOVE")
        return
      case "BAN":
        const ban = validateScope(key, BanScope)
        ban("ACCESS")
        ban("CREATE")
        ban("DELETE")
        return
      case "PLAYER":
        const player = validateScope(key, PlayerScope)
        player("KILL")
        player("KICK")
        return
      case "MAP":
        const map = validateScope(key, MapScope)
        map("SWITCH")
        map("MANAGE")
        return
      case "RESERVEDSLOT":
        const reserved = validateScope(key, ReservedSlotScope)
        reserved("ACCESS")
        reserved("CREATE")
        reserved("DELETE")
        return
      case "PLUGIN":
        const plugin = validateScope(key, PluginScope)
        plugin("ACCESS")
        plugin("MODIFY")
        return
      case "VARIABLE":
        const vars = validateScope(key, VariableScope)
        vars("MODIFY_BF3")
        vars("MODIFY_VU")
        return
    }
  })
  return scopes
}
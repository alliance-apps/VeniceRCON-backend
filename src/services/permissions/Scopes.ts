export type Scopes =
  typeof InstanceScope |
  typeof InstanceUserScope |
  typeof PlayerScope |
  typeof BanScope |
  typeof MapScope |
  typeof ReservedSlotScope |
  typeof PluginScope |
  typeof VariableScope |
  typeof EventScope |
  typeof ModScope

export const InstanceScope = {
  ACCESS: 0x01n,
  CREATE: 0x02n,
  UPDATE: 0x04n,
  DELETE: 0x08n,
  LOGS: 0x10n
}

export const InstanceUserScope = {
  ACCESS: 0x0100n,
  CREATE: 0x0200n,
  UPDATE: 0x0400n,
  REMOVE: 0x0800n
}

export const BanScope = {
  ACCESS: 0x010000n,
  CREATE: 0x020000n,
  DELETE: 0x040000n
}

export const PlayerScope = {
  KILL: 0x01000000n,
  KICK: 0x02000000n,
  MESSAGE: 0x04000000n,
  MOVE: 0x8000000n
}

export const MapScope = {
  SWITCH: 0x0100000000n,
  MANAGE: 0x0200000000n
}

export const ReservedSlotScope = {
  ACCESS: 0x010000000000n,
  CREATE: 0x020000000000n,
  DELETE: 0x040000000000n
}

export const PluginScope = {
  ACCESS: 0x01000000000000n,
  MODIFY: 0x02000000000000n,
  LOGS: 0x10n
}

export const VariableScope = {
  MODIFY: 0x0200000000000000n
}

export const EventScope = {
  CHAT: 0x010000000000000000n,
  KILL: 0x020000000000000000n
}

export const ModScope = {
  ACCESS: 0x0100000000000000000n,
  CREATE: 0x0200000000000000000n,
  UPDATE: 0x0400000000000000000n,
  DELETE: 0x0800000000000000000n
}

const translation: Record<string, Scopes> = {
  INSTANCE: InstanceScope,
  INSTANCEUSER: InstanceUserScope,
  PLAYER: PlayerScope,
  BAN: BanScope,
  MAP: MapScope,
  RESERVEDSLOT: ReservedSlotScope,
  VARIABLE: VariableScope,
  EVENT: EventScope
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
  const nodes = mask.split(":").map(hex => BigInt(`0x${hex}`))
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
        instance("LOGS")
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
        plugin("LOGS")
        return
      case "VARIABLE":
        const vars = validateScope(key, VariableScope)
        vars("MODIFY")
        return
      case "VARIABLE":
        const events = validateScope(key, EventScope)
        events("CHAT")
        return
      case "VARIABLE":
        const mods = validateScope(key, ModScope)
        mods("ACCESS")
        mods("CREATE")
        mods("DELETE")
        mods("UPDATE")
        return
    }
  })
  return scopes
}
import { Permission } from "@entity/Permission"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"

export class PermissionCache {

  private cache: Record<number, CacheItem> = {}

  /**
   * checks if a user is cached
   * @param id user id to check
   */
  hasCachedUser(id: number) {
    return this.cache[id] instanceof CacheItem
  }

  /**
   * adds a new user to the cache with set permisions
   * @param userId userid to cache
   * @param permissions permissions the user has
   */
  addCache(userId: number, permissions: Promise<Permission[]>) {
    this.cache[userId] = new CacheItem(userId, permissions)
    return this.cache[userId]
  }

  /**
   * retrieves an item from cache
   * @param userId cache item to retrieve
   */
  getCache(userId: number) {
    const item = this.cache[userId]
    if (!item) throw new Error("item not found in cache")
    return item
  }

  getUser(id: number) {
    if (this.hasCachedUser(id)) {
      return this.getCache(id)
    } else {
      const perms = getCustomRepository(PermissionRepository).getPermissions(id)
      return this.addCache(id, perms)
    }
  }

}

export class CacheItem {

  readonly userId: number
  readonly permissions: Promise<Permission[]>

  constructor(id: number, perms: Promise<Permission[]>) {
    this.userId = id
    this.permissions = perms
  }

  /**
   * checks if the user has a valid permission node for the specified instance
   * @param instance instance to check the permission if set to true then only root perms get searched
   * @param scope scope to check the permission
   */
  async hasPermission(instance: number|true, scope: Permission.Type) {
    return (await this.permissions)
      .filter(p => p.root || p.instanceId === instance)
      .some(p => p.hasPermission(scope))
  }
}


export namespace PermissionCache {

}
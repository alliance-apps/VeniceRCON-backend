import { Permission } from "@entity/Permission"
import { User } from "@entity/User"

export class PermissionCache {

  private cache: Record<number, CacheItem> = {}

  private getUserId(user: User|number) {
    return typeof user === "number" ? user : user.id
  }

  /**
   * checks if a user is cached
   * @param id user id to check
   */
  hasCachedUser(user: User|number) {
    return this.cache[this.getUserId(user)] instanceof CacheItem
  }

  /**
   * removes a user from cache
   * @param id
   */
  delUser(user: User|number) {
    delete this.cache[this.getUserId(user)]
  }

  /**
   * adds a new user to the cache with set permisions
   * @param userId userid to cache
   * @param permissions permissions the user has
   */
  addCache(user: User|number, permissions: Promise<Permission[]>) {
    const userId = this.getUserId(user)
    this.cache[userId] = new CacheItem(userId, permissions)
    return this.cache[userId]
  }

  /**
   * retrieves an item from cache
   * @param userId cache item to retrieve
   */
  getCache(user: User|number) {
    const userId = this.getUserId(user)
    const item = this.cache[userId]
    if (!item) throw new Error("item not found in cache")
    return item
  }

  /**
   * retrieves the permissions from a single user
   * @param user user to retrieve the permissions for
   */
  getUser(user: User|number) {
    if (this.hasCachedUser(user)) {
      return this.getCache(user)
    } else {
      return this.addCache(user, this.getUserPermissions(user))
    }
  }

  /**
   * loads the permissions from the repository
   * @param user
   */
  private getUserPermissions(user: User|number) {
    return Permission.createQueryBuilder("permission")
      .select()
      .where("permission.user = :id", { id: this.getUserId(user) })
      .getMany()
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
   * @param scope scope to check
   */
  async hasPermission(instance: number|true, scope: bigint) {
    return (await this.permissions)
      .filter(p => p.root || p.instanceId === instance)
      .some(p => p.hasPermission(scope))
  }

  /**
   * checks if the user has a valid permission node for the specified instance
   * @param instance instance to check the permission if set to true then only root perms get searched
   * @param scope scope to check
   */
  async hasPermissions(instance: number|true, scope: string) {
    return (await this.permissions)
      .filter(p => p.root || p.instanceId === instance)
      .some(p => p.hasPermissions(scope))
  }
}


export namespace PermissionCache {

}
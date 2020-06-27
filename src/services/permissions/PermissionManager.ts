import { User as UserEntity } from "@entity/User"
import { Instance as InstanceEntity } from "@entity/Instance"
import { Permission } from "@entity/Permission"
import { PermissionCache } from "./PermissionCache"
import { Scopes, InstanceScope } from "./Scopes"
import { socketManager } from "@service/koa/socket"

export class PermissionManager {

  private cache = new PermissionCache()

  /**
   * checks if a specific permission for an instance and user has been set
   * @param props
   */
  hasPermission(props: PermissionManager.HasPermissionProps) {
    const instanceId = props.instance instanceof InstanceEntity ? props.instance.id : props.instance
    return this.cache.getUser(props.user).hasPermission(instanceId, props.scope)
  }

  /**
   * retrieves the permission string
   * @param id user to retrieve the string from
   */
  getPermissions(user: UserEntity|number) {
    return this.cache.getUser(user).permissions
  }

  /**
   * deletes a user from the cache
   * @param user user to remove
   */
  removeUserFromCache(user: UserEntity|number) {
    return this.cache.delUser(user)
  }

  /**
   * adds a permission scope to a user for a specific instance
   * @param props
   */
  async updatePermissions(props: PermissionManager.UpdatePermissionProps) {
    const perms = await this.getPermissions(props.user)
    const perm = perms.find(p => p.instanceId === props.instance || p.root === props.instance)
    if (!perm) throw new Error(`can not add permission, user does not have access to the instance`)
    await perm.setPermissions(props.scopes)
    this.removeUserFromCache(props.user)
    await this.validateSocketAccess(props.user)
  }

  /**
   * creates a new permission
   * @param props
   */
  private async createPermission(props: Permission.ICreate) {
    const perm = await Permission.from(props)
    this.removeUserFromCache(props.user)
    await this.validateSocketAccess(props.user)
    return perm
  }

  /**
   * checks if the user has access to a specific instance
   * @param user user to check
   * @param instance instance to check
   */
  async hasInstanceAccess(user: UserEntity|number, instance: InstanceEntity|number) {
    const instanceId = typeof instance === "number" ? instance : instance.id
    const perms = await this.getPermissions(user)
    return perms.some(p => p.instanceId === instanceId)
  }

  /**
   * creates a new global permission for a specific user
   * @param props
   */
  async createGlobalPermission(props: PermissionManager.AddGlobalAccess) {
    const user = this.getUserId(props.user)
    const perm = await this.createPermission({ root: true, user, scopes: props.scopes })
    return perm
  }

  /**
   * creates a new instance permission for a specific user
   * @param props
   */
  async addInstanceAccess(props: PermissionManager.AddInstanceAccess) {
    const instance = this.getInstanceId(props.instance)
    const user = this.getUserId(props.user)
    const scopes: bigint[] = props.scopes||[]
    if (!scopes.includes(InstanceScope.ACCESS)) scopes.push(InstanceScope.ACCESS)
    const perm = await this.createPermission({ instance, user, scopes })
    return perm
  }

  /**
   * removes instance access from a router
   * @param user user to remove
   * @param instance instance to remove the user from
   */
  async removeInstanceAccess(user: UserEntity|number, instance: InstanceEntity|number) {
    const userId = this.getUserId(user)
    const instanceId = this.getInstanceId(instance)
    const perm = await Permission.findOne({ userId, instanceId })
    if (!perm) return false
    await perm.remove()
    this.removeUserFromCache(user)
    await this.validateSocketAccess(user)
    return true
  }

  private getUserId(user: UserEntity|number) {
    return typeof user === "number" ? user : user.id
  }

  private getInstanceId(instance: InstanceEntity|number) {
    return typeof instance === "number" ? instance : instance.id
  }

  private validateSocketAccess(user: UserEntity|number) {
    return socketManager
      .getSocketsByUserId(this.getUserId(user))
      .checkAccess()
  }

}


export namespace PermissionManager {

  export interface AddInstanceAccess {
    user: UserEntity|number
    instance: InstanceEntity|number
    scopes: bigint[]
  }

  export interface AddGlobalAccess {
    user: UserEntity|number
    scopes?: bigint[]
  }

  export interface HasPermissionProps {
    user: UserEntity|number
    instance: InstanceEntity|number|true
    scope: bigint
  }

  export interface UpdatePermissionProps {
    user: UserEntity|number
    instance: InstanceEntity|number|true
    scopes: bigint[]
  }

}
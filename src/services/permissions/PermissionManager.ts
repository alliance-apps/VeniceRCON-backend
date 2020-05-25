import { User as UserEntity } from "@entity/User"
import { Instance as InstanceEntity } from "@entity/Instance"
import { Permission } from "@entity/Permission"
import { PermissionCache } from "./PermissionCache"

export class PermissionManager {
  
  private cache = new PermissionCache()

  /**
   * checks if a specific permission for an instance and user has been set
   * @param props 
   */
  hasPermission(props: PermissionManager.IHasPermissionProps) {
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
  async addPermission(props: PermissionManager.IUpdatePermissionProps) {
    const perms = await this.getPermissions(props.user)
    const perm = perms.find(p => p.instanceId === props.instance)
    if (!perm) throw new Error(`can not add permission, user does not have access to the instance`)
    if (perm.hasPermission(props.scope)) return
    await perm.setPermission(props.scope)
    this.removeUserFromCache(props.user)
  }

  /**
   * adds a permission scope to a user for a specific instance
   * @param props 
   */
  async delPermission(props: PermissionManager.IUpdatePermissionProps) {
    const perms = await this.getPermissions(props.user)
    const perm = perms.find(p => p.instanceId === props.instance)
    if (!perm) throw new Error(`can not add permission, user does not have access to the instance`)
    if (!perm.hasPermission(props.scope)) return
    await perm.delPermission(props.scope)
    this.removeUserFromCache(props.user)
  }

  /**
   * creates a new permission
   * @param props 
   */
  async createPermission(props: Permission.ICreate) {
    const perm = await Permission.from(props)
    this.removeUserFromCache(props.user)
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

}


export namespace PermissionManager {

  export interface IHasPermissionProps {
    user: UserEntity|number
    instance: InstanceEntity|number|true
    scope: Permission.Type
  }

  export interface IUpdatePermissionProps {
    user: UserEntity|number
    instance: InstanceEntity|number
    scope: Permission.Type
  }

}
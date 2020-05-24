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
    const userId = typeof props.user === "number" ? props.user : props.user.id
    const instanceId = props.instance instanceof InstanceEntity ? props.instance.id : props.instance
    return this.cache.getUser(userId).hasPermission(instanceId, props.scope)
  }

  /**
   * retrieves the permission string
   * @param id user to retrieve the string from
   */
  getPermissions(id: number) {
    return this.cache.getUser(id).permissions
  }

}


export namespace PermissionManager {

  export interface IHasPermissionProps {
    user: UserEntity|number
    instance: InstanceEntity|number|true
    scope: Permission.Type
  }

}
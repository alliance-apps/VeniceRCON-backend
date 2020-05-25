import { EntityRepository, Repository } from "typeorm"
import { User } from "@entity/User"
import { Permission } from "@entity/Permission"
import { Instance } from "@entity/Instance"
import { getScopesFromMask } from "@service/permissions/Scopes"

@EntityRepository(Permission)
export class PermissionRepository extends Repository<Permission> {

  /**
   * retrieves all permissions a user has
   * @param user user to get the permissions for
   */
  getPermissions(user: User|number): Promise<Permission[]> {
    return Permission.createQueryBuilder("permission")
      .select()
      .where("permission.user = :id", { id: typeof user === "number" ? user : user.id })
      .getMany()
  }

  /**
   * retrieves all permissions from a specific instance
   * @param instance instance to get the permissions for
   */
  getInstanceUsers(instance: Instance|number): Promise<PermissionRepository.IInstanceUser[]> {
    const instanceId = instance instanceof Instance ? instance.id : instance
    return this.getPermissionQueryBuilder()
      .where("perm.instanceId = :instanceId", { instanceId })
      .getRawMany()
      .then((res: any) => {
        return res.map((r: any) => {
          const { mask, ...rest } = r
          return {
            ...rest,
            scopes: getScopesFromMask(mask)
          }
        })
      })
  }

  /**
   * retrieves all permissions from a specific instance
   * @param instance instance to get the permissions for
   */
  getInstanceUser(instance: Instance|number, user: User|number): Promise<PermissionRepository.IInstanceUser> {
    const instanceId = instance instanceof Instance ? instance.id : instance
    const userId = user instanceof Instance ? user.id : user
    return this.getPermissionQueryBuilder()
      .where("perm.instanceId = :instanceId", { instanceId })
      .andWhere("user.id = :userId", { userId })
      .getRawOne()
      .then((res: any) => {
        const { mask, ...rest } = res
        return { ...rest, scopes: getScopesFromMask(mask) }
      })
  }

  private getPermissionQueryBuilder() {
    return Permission.createQueryBuilder("perm")
      .select("perm.userId", "userId")
      .addSelect("perm.id", "permId")
      .addSelect("user.username", "username")
      .addSelect("perm.created", "created")
      .addSelect("perm.modified", "modified")
      .addSelect("perm.mask", "mask")
      .leftJoin("perm.user", "user")
  }

}

export namespace PermissionRepository {
  export type IRawPermissions = {
    id: number,
    instance: number,
    mask: string
  }[]

  export interface IInstanceUser {
    userId: number
    permId: number
    username: string
    created: string
    modified: string
    scopes: string[]
  }
}
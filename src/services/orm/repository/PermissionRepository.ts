import { EntityRepository, Repository } from "typeorm"
import { User } from "@entity/User"
import { Permission } from "@entity/Permission"

@EntityRepository(Permission)
export class PermissionRepository extends Repository<Permission> {

  getPermissions(user: User|number): Promise<Permission[]> {
    return Permission.createQueryBuilder("permission")
      .select()
      .where("permission.user = :id", { id: typeof user === "number" ? user : user.id })
      .getMany()
  }

}

export namespace PermissionRepository {
  export type IRawPermissions = {
    id: number,
    instance: number,
    mask: string
  }[]
}
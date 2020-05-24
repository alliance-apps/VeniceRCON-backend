import { EntityRepository, Repository } from "typeorm"
import { User } from "@entity/User"
import { Permission } from "@entity/Permission"
import { Instance } from "@entity/Instance"

@EntityRepository(User)
export class UserRepository extends Repository<User> {

  getInstanceUsers(instance: Instance|number) {
    const instanceId = instance instanceof Instance ? instance.id : instance
    return Permission.createQueryBuilder("perm")
      .select()
      .where("perm.instanceId = :instanceId", { instanceId })
      .leftJoinAndSelect("perm.user", "user")
      .getMany()
  }  

}

export namespace UserRepository {
  export type IRawPermissions = {
    id: number,
    instance: number,
    mask: string
  }[]
}
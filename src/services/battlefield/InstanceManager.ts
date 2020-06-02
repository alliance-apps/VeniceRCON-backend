import { Instance } from "./Instance"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { Battlefield } from "vu-rcon"
import { getRepository } from "typeorm"
import { Scopes } from "@service/permissions/Scopes"
import { User } from "@entity/User"
import { socketManager } from "@service/koa/socket"

export class InstanceManager {

  instances: Instance[] = []

  /**
   * initializes the instance manager
   */
  async initialize() {
    await Promise.all(this.instances.map(instance => instance.stop()))
    const instances = await InstanceEntity.find()
    this.instances = await Promise.all(
      instances.map(entity => Instance.from({ entity }))
    )
  }

  /**
   * adds a new battlefield instance
   * @param props
   */
  async createInstance(props: Battlefield.Options) {
    const res = await Battlefield.testConnection(props)
    if (res instanceof Error) throw res
    let instance: Instance|undefined
    let entity: InstanceEntity|undefined
    try {
      entity = await InstanceEntity.from(props)
      instance = await Instance.from({ entity })
      this.instances.push(instance)
      await socketManager.checkAccess()
      return instance
    } catch (e) {
      console.log("instance creation failed", e)
      if (!entity) throw e
      if (instance instanceof Instance) {
        this.instances.push(instance)
      } else {
        await entity.remove()
      }
      throw e
    }
  }

  /**
   * removes an instance by its entity id
   * @param id entity id to remove
   */
  async removeInstance(id: number) {
    const instance = this.getInstanceById(id)
    await instance.remove()
    this.instances = this.instances.filter(i => i !== instance)
    const entity = await getRepository(InstanceEntity).findOne({ id })
    if (entity) await entity.remove()
  }

  /**
   * retrieves a single instance by its id
   * @param id
   */
  getInstanceById(id: number) {
    const instance = this.instances.find(instance => instance.id === id)
    if (!instance) throw new Error(`could not find instance with id ${id}`)
    return instance
  }

  /**
   * gets all instances with a user has permission with a specific scope to
   * @param user user to check permissions for
   * @param scope scope to check
   */
  async getInstancesWithPermissions(user: User|number, scope: Scopes) {
    //copy instances so if an instance gets added while checking permissions it wont fuck with the indexes
    const instances = [...this.instances]
    const allowed = await Promise.all(instances.map(instance => instance.hasPermission(user, scope)))
    return instances.filter((_, i) => allowed[i])
  }
}

export namespace InstanceManager {

}
import { Instance } from "./Instance"
import { Instance as InstanceEntity } from "@service/orm/entity/Instance"
import { Battlefield } from "vu-rcon"
import { getRepository } from "typeorm"

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
  async addInstance(props: Battlefield.Options) {
    const entity = await InstanceEntity.from(props)
    try {
      const instance = await Instance.from({ entity })
      this.instances.push(instance)
      return instance
    } catch (e) {
      await entity.remove()
      throw e
    }
  }

  /**
   * removes an instance by its entity id
   * @param id entity id to remove
   */
  async removeInstance(id: number) {
    const instance = this.getInstanceById(id)
    if (!instance) return
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
    return this.instances.find(i => i.container.id === id)
  }
}

export namespace InstanceManager {
  
}
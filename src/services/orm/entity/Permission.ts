import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Instance as InstanceEntity } from "./Instance"
import { User as UserEntity } from "./User"

@Entity()
export class Permission extends AbstractEntity<Permission> {

  protected entityClass = Permission

  @ManyToOne(
    type => InstanceEntity,
    instance => instance.permissions,
    { nullable: true, onDelete: "CASCADE", cascade: true }
  )
  instance!: Promise<InstanceEntity|undefined>

  @Column({ nullable: true })
  instanceId!: number

  @Column({ default: false })
  root!: boolean

  @ManyToOne(
    type => UserEntity,
    user => user.permissions,
    { nullable: false, onDelete: "CASCADE", cascade: true }
  )
  user!: Promise<UserEntity>

  @Column({ nullable: true })
  userId!: number

  @Column({ default: "0" })
  mask!: string

  /** sets the user of the permission */
  setUser(user: UserEntity|number) {
    return this.setRelation("user", user)
  }

  /** sets the instance of the permission */
  setInstance(instance: InstanceEntity|number) {
    return this.setRelation("instance", instance)
  }

  /** sets a specific permission */
  setPermission(perm: Permission.Type) {
    const nodes = this.getPermissionNodes()
    let index = 0
    while (perm > 255) {
      index++
      perm = perm >>> 8
    }
    if (nodes.length < index) nodes.push(...Array(index - nodes.length).fill(0))
    nodes[index] |= perm
    this.mask = nodes.map(n => n.toString(16)).map(c => c.length === 1 ? `0${c}` : c).join(":")
    return this
  }

  /** removes a specific permission */
  delPermission(perm: Permission.Type) {
    const nodes = this.getPermissionNodes()
    let index = 0
    while (perm > 255) {
      index++
      perm = perm >>> 8
    }
    if (nodes.length < index) nodes.push(...Array(index - nodes.length).fill(0))
    nodes[index] &= ~perm
    this.mask = nodes.map(n => n.toString(16)).map(c => c.length === 1 ? `0${c}` : c).join(":")
    return this
  }

  /** checks if there is a permission set */
  hasPermission(perm: Permission.Type) {
    const nodes = this.getPermissionNodes()
    let index = 0
    while (perm > 255) {
      index++
      perm = perm >>> 8
    }
    if (nodes.length < index) return false
    return (nodes[index] & perm) === perm
  }

  /** retrieves readable scope names */
  getScopes() {
    const scopes: string[] = []
    const validateScope = (prefix: string, e: any) => {
      return (val: Permission.Type) => {
        if (!this.hasPermission(val)) return
        scopes.push(`${prefix}#${e[val]}`)
      }
    }
    Array(2).fill(null).map((_, index) => {
      switch(index) {
        case 0:
          const instance = validateScope("INSTANCE", Permission.Instance)
          instance(Permission.Instance.ACCESS)
          instance(Permission.Instance.CREATE)
          instance(Permission.Instance.DELETE)
          instance(Permission.Instance.UPDATE)
          return
        case 1:
          const user = validateScope("USER", Permission.User)
          user(Permission.User.ADD)
          user(Permission.User.UPDATE)
          user(Permission.User.REMOVE)
          return
      }
    })
    return scopes
  }

  /**
   * gets the permission nodes
   */
  private getPermissionNodes() {
    return this.mask.split(":").map(hex => parseInt(hex, 16))
  }

  /** creates a new instance */
  static async from(props: Permission.ICreate) {
    if (props.root && props.instance)
      throw new Error("can either set root or instance but not both")
    if (!props.root && !props.instance)
      throw new Error("either root or instance required but both are missing")
    const perm = new Permission()
    perm.mask = props.mask || "00"
    perm.root = props.root === true
    await perm.save()
    const update = [perm.setUser(props.user)]
    if (props.instance) update.push(perm.setInstance(props.instance))
    await Promise.all(update)
    await perm.reload()
    return perm
  }

}

export namespace Permission {

  export interface ICreate {
    user: UserEntity|number
    instance?: InstanceEntity|number
    root?: boolean,
    mask?: string
  }

  export type Type = Instance | User

  export enum Instance {
    ACCESS = 0x01,
    CREATE = 0x02,
    UPDATE = 0x04,
    DELETE = 0x08
  }
  
  export enum User {
    ADD = 0x100,
    UPDATE = 0x200,
    REMOVE = 0x400,
  }

}
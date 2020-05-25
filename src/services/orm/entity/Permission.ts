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

  /** sets multiple permissions */
  setPermissions(perms: Permission.Type[], save: boolean = true) {
    perms.forEach(p => this.setPermission(p, false))
    if (save) return this.save({ reload: true })
    return this
  }

  /** sets a specific permission */
  setPermission(perm: Permission.Type, save: boolean = true) {
    const nodes = this.getPermissionNodes()
    let index = 0
    while (perm > 255) {
      index++
      perm = perm >>> 8
    }
    if (nodes.length < index) nodes.push(...Array(index - nodes.length).fill(0))
    nodes[index] |= perm
    this.mask = nodes.map(n => n.toString(16)).map(c => c.length === 1 ? `0${c}` : c).join(":")
    if (save) return this.save({ reload: true })
    return this
  }

  /** removes multiple permissions */
  detPermissions(perms: Permission.Type[], save: boolean = true) {
    perms.forEach(p => this.setPermission(p, false))
    if (save) return this.save({ reload: true })
    return this
  }

  /** removes a specific permission */
  delPermission(perm: Permission.Type, save: boolean = true) {
    const nodes = this.getPermissionNodes()
    let index = 0
    while (perm > 255) {
      index++
      perm = perm >>> 8
    }
    if (nodes.length < index) nodes.push(...Array(index - nodes.length).fill(0))
    nodes[index] &= ~perm
    this.mask = nodes.map(n => n.toString(16)).map(c => c.length === 1 ? `0${c}` : c).join(":")
    if (save) return this.save({ reload: true })
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
          const user = validateScope("INSTANCEUSER", Permission.InstanceUser)
          user(Permission.InstanceUser.ACCESS)
          user(Permission.InstanceUser.CREATE)
          user(Permission.InstanceUser.UPDATE)
          user(Permission.InstanceUser.REMOVE)
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
    const perm = new Permission()
    perm.mask = props.mask || "00"
    if (props.scopes) perm.setPermissions(props.scopes, false)
    if ("root" in props) perm.root = true
    await perm.save()
    const update = [perm.setUser(props.user)]
    if ("instance" in props) update.push(perm.setInstance(props.instance))
    await Promise.all(update)
    await perm.reload()
    return perm
  }

}

export namespace Permission {

  export type ICreate = ICreateRoot | ICreateInstance

  export interface ICreateBase {
    user: UserEntity|number
    mask?: string
    scopes?: Permission.Type[]
  }

  export interface ICreateRoot extends ICreateBase {
    root: boolean
  }

  export interface ICreateInstance extends ICreateBase {
    instance: InstanceEntity|number
  }

  export type Type = Instance | InstanceUser

  export enum Instance {
    ACCESS = 0x01,
    CREATE = 0x02,
    UPDATE = 0x04,
    DELETE = 0x08
  }
  
  export enum InstanceUser {
    ACCESS = 0x100,
    CREATE = 0x200,
    UPDATE = 0x400,
    REMOVE = 0x800
  }

}
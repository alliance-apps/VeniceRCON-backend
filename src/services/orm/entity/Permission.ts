import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Instance as InstanceEntity } from "./Instance"
import { User as UserEntity } from "./User"
import { getScopesFromMask, hasPermission } from "@service/permissions/Scopes"

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
  async setPermissions(perms: bigint[], save: boolean = true) {
    perms.forEach(p => this.setPermission(p, false))
    if (save) return this.save({ reload: true })
    return this
  }

  /** sets a specific permission */
  setPermission(perm: bigint, save: boolean = true) {
    const nodes = this.mask.split(":").map(hex => BigInt(`0x${hex}`))
    let index = 0
    while (perm > 255n) {
      index++
      perm = perm >> 8n
    }
    if (nodes.length <= index) nodes.push(...Array(index - nodes.length + 1).fill(0n))
    nodes[index] |= perm
    this.mask = nodes.map(n => n.toString(16)).map(c => c.length === 1 ? `0${c}` : c).join(":")
    if (save) return this.save({ reload: true })
    return this
  }

  /** removes multiple permissions */
  detPermissions(perms: bigint[], save: boolean = true) {
    perms.forEach(p => this.setPermission(p, false))
    if (save) return this.save({ reload: true })
    return this
  }

  /** removes a specific permission */
  delPermission(perm: bigint, save: boolean = true) {
    const nodes = this.mask.split(":").map(hex => BigInt(`0x${hex}`))
    let index = 0
    while (perm > 255n) {
      index++
      perm = perm >> 8n
    }
    if (nodes.length <= index) nodes.push(...Array(index - nodes.length + 1).fill(0n))
    nodes[index] &= ~perm
    this.mask = nodes.map(n => n.toString(16)).map(c => c.length === 1 ? `0${c}` : c).join(":")
    if (save) return this.save({ reload: true })
    return this
  }

  /** checks if there is a permission set */
  hasPermission(perm: bigint) {
    return hasPermission(this.mask, perm)
  }

  /** retrieves readable scope names */
  getScopes() {
    return getScopesFromMask(this.mask)
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
    scopes?: bigint[]
  }

  export interface ICreateRoot extends ICreateBase {
    root: boolean
  }

  export interface ICreateInstance extends ICreateBase {
    instance: InstanceEntity|number
  }

}
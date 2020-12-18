import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { Instance as InstanceEntity } from "./Instance"
import { User as UserEntity } from "./User"
import { getScopesFromMask, hasPermissions } from "@service/permissions/Scopes"

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

  @Column()
  userId!: number

  @Column({ default: "0", name: "mask" })
  protected _mask!: string

  set mask(value: bigint) {
    if (typeof value !== "bigint") throw new Error(`value needs to be a bigint, got ${typeof value}`)
    this._mask = String(value)
  }

  get mask() {
    return BigInt(this._mask)
  }

  /** checks if there is a permission set */
  hasPermissions(perm: bigint) {
    return hasPermissions(this.mask, perm)
  }

  /** retrieves readable scope names */
  getScopes() {
    return getScopesFromMask(this.mask)
  }

  /**
   * adds permissions to the user
   * @param scopes permissions to add
   */
  addPermissions(scopes: bigint) {
    this.mask = this.mask | scopes
    return this
  }

  /**
   * removes a set permissions to the user
   * @param scopes permissions to remove
   */
  delPermissions(scopes: bigint) {
    this.mask = this.mask & ~scopes
    return this
  }

  /** creates a new instance */
  static from(props: Permission.ICreate) {
    const perm = new Permission()
    perm.mask = props.mask || 0n
    if (props.scopes) perm.mask = props.scopes.reduce((mask, bit) => mask | bit, 0n)
    if ("root" in props) perm.root = true
    perm.userId = AbstractEntity.fetchId(props.user)
    if ("instance" in props && typeof props.instance === "number")
      perm.instanceId = AbstractEntity.fetchId(props.instance)
    return perm.save()
  }

}

export namespace Permission {

  export type ICreate = ICreateRoot | ICreateInstance

  export interface ICreateBase {
    user: UserEntity|number
    mask?: bigint
    scopes?: bigint[]
  }

  export interface ICreateRoot extends ICreateBase {
    root: boolean
  }

  export interface ICreateInstance extends ICreateBase {
    instance: InstanceEntity|number
  }

}
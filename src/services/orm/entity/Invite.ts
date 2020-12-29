import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { User } from "./User"
import { Instance } from "./Instance"
import { randomBytes } from "crypto"
import { permissionManager } from "@service/permissions"
import { getScopesFromMask } from "@service/permissions/Scopes"

@Entity()
export class Invite extends AbstractEntity<Invite> {

  protected entityClass = Invite

  @Column({ unique: true })
  token!: string

  @Column({ default: "0", name: "mask" })
  protected _mask!: string

  @ManyToOne(
    type => User, user => user.invites,
    { onDelete: "CASCADE" }
  )
  issuer!: Promise<User>

  @Column()
  issuerId!: number

  @ManyToOne(
    type => Instance, instance => instance.invites,
    { onDelete: "CASCADE" }
  )
  instance!: Promise<Instance>

  @Column()
  instanceId!: number

  @ManyToOne(
    type => User,
    { nullable: true, onDelete: "CASCADE"}
  )
  user!: Promise<User|null>

  @Column({ nullable: true })
  userId?: number

  set mask(value: bigint) {
    if (typeof value !== "bigint") throw new Error(`value needs to be a bigint, got ${typeof value}`)
    this._mask = String(value)
  }

  get mask() {
    return BigInt(this._mask)
  }

  /** retrieves readable scope names */
  getScopes() {
    return getScopesFromMask(this.mask)
  }

  /** checks if this token is consumeable */
  async isConsumeable(user?: User) {
    if (!this.instanceId) return Invite.Consumeable.NO_INSTANCE
    if (this.userId) return Invite.Consumeable.ALREADY_ISSUED
    if (!user || await permissionManager.hasInstanceAccess(user, this.instanceId))
      return Invite.Consumeable.USER_HAS_PERMISSIONS
    return Invite.Consumeable.OK
  }

  /**
   * uses the token by the specified user
   */
  async consume(user: User) {
    if (this.userId) throw new Error(`can not use this token, it already has been used by someone else`)
    await this.setRelation("user", user)
    await this.reload()
    if (typeof this.userId !== "number") throw new Error(`failed to assign user to token id ${this.id}, userid is still null after assignment`)
    return permissionManager.addInstanceAccess({ user, instance: this.instanceId, scopes: [this.mask] })
  }

  /** creates a new instance */
  static from(props: Invite.ICreate) {
    const invite = new Invite()
    invite.token = randomBytes(16).toString("hex")
    invite.instanceId = AbstractEntity.fetchId(props.instance)
    invite.issuerId = AbstractEntity.fetchId(props.issuer)
    invite.mask = props.mask
    return invite.save()
  }

}

export namespace Invite {

  export interface ICreate {
    issuer: User|number
    instance: Instance|number
    mask: bigint
  }

  export enum Consumeable {
    OK,
    NO_INSTANCE,
    ALREADY_ISSUED,
    USER_HAS_PERMISSIONS
  }

}
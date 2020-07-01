import { Entity, Column, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { User } from "./User"
import { Instance } from "./Instance"
import { randomBytes } from "crypto"
import { permissionManager } from "@service/permissions"
import { InstanceScope } from "@service/permissions/Scopes"

@Entity()
export class Invite extends AbstractEntity<Invite> {

  protected entityClass = Invite

  @Column({ unique: true })
  token!: string

  @ManyToOne(
    type => User,
    user => user.invites,
    { onDelete: "CASCADE", cascade: true }
  )
  issuer!: Promise<User>

  @Column({ nullable: true })
  issuerId!: number

  @ManyToOne(
    type => Instance,
    instance => instance.invites,
    { onDelete: "CASCADE", cascade: true }
  )
  instance!: Promise<Instance>

  @Column({ nullable: true })
  instanceId!: number

  @ManyToOne(type => User, { nullable: true })
  user!: Promise<User|null>

  @Column({ nullable: true })
  userId?: number

  /**
   * uses the token by the specified user
   */
  async consume(user: User) {
    if (this.userId) throw new Error(`can not use this token, it already has been used by someone else`)
    await this.setUser(user)
    await this.reload()
    return permissionManager.addInstanceAccess({
      user, instance: this.instanceId, scopes: [InstanceScope.ACCESS]
    })
  }

  setUser(user: User|number) {
    return this.setRelation("user", user)
  }

  /** sets the issuer of the invite link */
  setIssuer(issuer: User|number) {
    return this.setRelation("issuer", issuer)
  }

  /** sets the instance for the invite link */
  setInstance(instance: Instance|number) {
    return this.setRelation("instance", instance)
  }

  /** creates a new instance */
  static from(props: Invite.ICreate) {
    const invite = new Invite()
    invite.token = randomBytes(16).toString("hex")
    invite.instanceId = AbstractEntity.fetchId(props.instance)
    invite.issuerId = AbstractEntity.fetchId(props.issuer)
    return invite.save()
  }

}

export namespace Invite {

  export interface ICreate {
    issuer: User|number
    instance: Instance|number
  }

}
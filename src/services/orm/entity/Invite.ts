import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { User } from "./User"
import { Instance } from "./Instance"
import { randomBytes } from "crypto"

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

  @OneToOne(type => User, { nullable: true })
  @JoinColumn()
  user!: Promise<User|null>

  /** sets the issuer of the invite link */
  setIssuer(issuer: User|number) {
    return this.setRelation("issuer", issuer)
  }

  /** sets the instance for the invite link */
  setInstance(instance: Instance|number) {
    return this.setRelation("instance", instance)
  }

  /** creates a new instance */
  static async from(props: Invite.ICreate) {
    const invite = new Invite()
    invite.token = randomBytes(16).toString("hex")
    await invite.save()
    await Promise.all([
      invite.setInstance(props.instance),
      invite.setIssuer(props.issuer)
    ])
    await invite.reload()
    return invite
  }

}

export namespace Invite {

  export interface ICreate {
    issuer: User|number
    instance: Instance|number
  }

}
import { Entity, Column, OneToMany, ManyToMany, JoinTable, Index } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { hash, compare } from "bcrypt"
import { Permission } from "./Permission"
import { Invite } from "./Invite"
import { Player } from "./Player"

@Entity()
export class User extends AbstractEntity<User> {

  protected entityClass = User

  @Column({ unique: true })
  username!: string

  @Column({ nullable: true, type: "varchar", length: 255 })
  @Index({ unique: true, where: "email IS NOT NULL" })
  email!: string|null

  @Column()
  password!: string

  @OneToMany(type => Permission, perm => perm.user)
  permissions!: Promise<Permission[]>

  @ManyToMany(type => Player, player => player.users)
  @JoinTable()
  players!: Promise<Player[]>

  @OneToMany(type => Invite, invite => invite.user)
  invites!: Promise<Invite[]>

  /** checks if the password match */
  validatePassword(password: string) {
    return compare(password, this.password)
  }

  /** adds a player to this user */
  addPlayer(player: Player|number) {
    return User.createQueryBuilder()
      .relation(User, "players")
      .of(this)
      .add(player)
  }

  /** removes a player from this user */
  delPlayer(player: Player|number) {
    return User.createQueryBuilder()
      .relation(User, "players")
      .of(this)
      .remove(player)
  }

  /**
   * updates the current password
   * @param newPass
   */
  async updatePassword(newPass: string) {
    this.password = await hash(newPass, 10)
    return this
  }

  /**
   * retrieves serializeable user informations
   */
  async getUserAndPermissions() {
    return {
      ...this,
      password: undefined,
      __permissions__: undefined,
      permissions: (await this.permissions).map(perm => ({
        id: perm.id,
        root: perm.root,
        instanceId: perm.instanceId,
        scopes: perm.getScopes()
      }))
    }
  }

  static async getUsersAndPermissions(): Promise<any> {
    return await Promise.all((await User
      .createQueryBuilder("u")
      .select()
      .leftJoinAndSelect("u.permissions", "permission")
      .getMany()
    ).map(user => user.getUserAndPermissions()))
  }

  /** creates a new instance */
  static async from(props: User.ICreate) {
    const user = new User()
    user.username = props.username
    if (props.email) user.email = props.email
    await user.updatePassword(props.password)
    return user.save()
  }

}

export namespace User {

  export interface ICreate {
    username: string
    password: string
    email?: string
  }
}
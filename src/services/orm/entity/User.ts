import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { hash, compare } from "bcrypt"
import { Permission } from "./Permission"
import { Invite } from "./Invite"

@Entity()
export class User extends AbstractEntity<User> {

  protected entityClass = User

  @Column({ unique: true })
  username!: string

  @Column()
  password!: string

  @OneToMany(type => Permission, perm => perm.user)
  permissions!: Promise<Permission[]>

  @OneToMany(type => Invite, invite => invite.user)
  invites!: Promise<Invite[]>

  /** checks if the password match */
  validatePassword(password: string) {
    return compare(password, this.password)
  }

  /**
   * updates the current password
   * @param newPass 
   */
  async updatePassword(newPass: string) {
    this.password = await hash(newPass, 10)
    return this
  }

  /** creates a new instance */
  static async from(props: User.ICreate) {
    const user = new User()
    user.username = props.username
    await user.updatePassword(props.password)
    return user.save()
  }

}

export namespace User {

  export interface ICreate {
    username: string
    password: string
  }
}
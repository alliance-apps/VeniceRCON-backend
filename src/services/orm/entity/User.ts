import { Entity, Column } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { hash, compare } from "bcrypt"

export enum UserType {
  DEFAULT = 0,
  PROTECTED = 1
}

@Entity()
export class User extends AbstractEntity<User> {

  protected entityClass = User

  @Column({ unique: true })
  username!: string

  @Column()
  password!: string

  @Column({ type: "int", unsigned: true, default: 0 })
  permissions!: number

  @Column({
    type: "enum",
    enum: UserType,
    default: UserType.DEFAULT
  })
  type!: UserType

  /**
   * sets a specific permission bit
   * @param perm bit to set
   */
  setPermission(perm: User.Perm) {
    this.permissions |= perm
    return this
  }

  /**
   * unsets a specific permission bit
   * @param perm bit to unset
   */
  delPermission(perm: User.Perm) {
    this.permissions &= ~ perm
    return this
  }

  /**
   * checks if the client has a certain permission
   * @param perm permission to check
   */
  hasPermission(perm: User.Perm) {
    return (this.permissions & perm) === perm
  }

  getPermissions() {
    
  }

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
    user.permissions = props.permissions
    user.type = props.type || UserType.DEFAULT
    await user.updatePassword(props.password)
    return user.save()
  }

}

export namespace User {

  export interface ICreate {
    username: string
    password: string
    permissions: number
    type?: UserType
  }

  export enum Perm {
    KICK = 0x1,
    BAN = 0x2,
    CHANGEMAP = 0x4,
    MESSAGE = 0x8,
    MANAGE_USER = 0x10,
    MANAGE_INSTANCE = 0x20,
    MANAGE_PLUGIN = 0x40,
    // = 0x80,
    // = 0x100,
    // = 0x200,
    // = 0x400,
    // = 0x800,
    // = 0x1000,
    // = 0x2000,
    // = 0x4000,
    // = 0x8000
  }
}
import { Column, PrimaryGeneratedColumn, BaseEntity, UpdateResult, SaveOptions, getRepository } from "typeorm"
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity"

export abstract class AbstractEntity<T extends AbstractEntity<any>> extends BaseEntity {

  protected abstract entityClass: (new () => any)

  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    default: () => "CURRENT_TIMESTAMP",
    readonly: true
  })
  created!: Date

  @Column({
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP"
  })
  modified!: Date

  /** override default save options */
  save(options?: SaveOptions | undefined) {
    const defaults: SaveOptions = { transaction: false, reload: false }
    if (this.id === undefined) defaults.reload = true
    return super.save({ ...defaults, ...options })
  }

  protected setRelation(name: keyof T, id: number|{ id: number }) {
    if (typeof this.id !== "number")
      throw new Error(`can not create relation, id is not a number (has the entity been saved?)`)
    return getRepository(this.entityClass)
        .createQueryBuilder()
        .relation(this.entityClass, name as string)
        .of({ id: this.id })
        .set(typeof id === "number" ? id : id.id)
  }

  protected addRelation(name: keyof T, id: number|{ id: number }) {
    if (typeof this.id !== "number")
      throw new Error(`can not create relation, id is not a number (has the entity been saved?)`)
    return getRepository(this.entityClass)
      .createQueryBuilder()
      .relation(this.entityClass, name as string)
      .of({ id: this.id })
      .add(typeof id === "number" ? id : id.id)
  }

  protected delRelation(name: keyof T, id: number|{ id: number }) {
    if (typeof this.id !== "number")
      throw new Error(`can not remove relation, id is not a number (has the entity been saved?)`)
    return getRepository(this.entityClass)
        .createQueryBuilder()
        .relation(this.entityClass, name as string)
        .of({ id: this.id })
        .remove(typeof id === "number" ? id : id.id)
  }

  /**
   * updates the own entity without reloading
   * @param data fields to update
   */
  update(data: QueryDeepPartialEntity<T>): Promise<UpdateResult> {
    return getRepository(this.entityClass)
      .createQueryBuilder()
      .update()
      .where({ id: this.id })
      .set(data)
      .execute()
  }

  static fetchId(entity: AbstractEntity<any>|number) {
    return typeof entity === "number" ? entity : entity.id
  }

}
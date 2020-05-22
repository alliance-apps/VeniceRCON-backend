import { EventEmitter } from "events"
import { io } from "@service/koa/socket"
import { deepStrictEqual } from "assert"

export interface Container<T extends {}> {
  on(event: "update", cb: (data: Container.UpdateEvent<T>) => void): this
}

export abstract class Container<T extends {}> extends EventEmitter {

  abstract readonly namespace: string 
  abstract readonly id: number
  private readonly state: T

  constructor(initial: T) {
    super()
    this.state = initial
  }

  /** retrieves a clone from the current state */
  getStateClone(): T {
    return { id: this.id, ...this.state }
  }

  /**
   * retrieves a value
   * @param name key of the value
   */
  get<Y extends keyof T>(name: Y): T[Y] {
    return this.state[name]
  }

  /**
   * updates a given value
   * @param name key to update
   * @param value new value
   */
  protected set<Y extends keyof T>(name: Y, value: T[Y]) {
    if (this.equal(this.state[name], value)) return this
    this.state[name] = value
    this.emitSocket(name)
    return this
  }

  private emitSocket(name: keyof T) {
    if (!io) return
    io.emit(`${this.namespace}#update`, {
      id: this.id,
      name,
      value: this.state[name]
    })
  }

  private equal(a: any, b: any) {
    try {
      deepStrictEqual(a, b)
      return true
    } catch (e) {
      return false
    }
  }

}

export namespace Container {

  export interface UpdateEvent<T, Y extends keyof T = keyof T> {
    name: Y
    value: T[Y]
  }

}
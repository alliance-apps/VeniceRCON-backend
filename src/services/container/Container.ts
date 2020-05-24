import { EventEmitter } from "events"
import { io } from "@service/koa/socket"
import { deepStrictEqual } from "assert"
import { Socket } from "socket.io"

export interface Container<T extends {}> {
  on(event: "update", cb: (data: Container.UpdateEvent<T>) => void): this
}

export abstract class Container<T extends {}> extends EventEmitter {

  abstract readonly namespace: string 
  abstract readonly id: number
  protected readonly state: T

  constructor(initial: T) {
    super()
    this.state = initial
  }

  /**
   * checks if messages are allowed to get emitted to the specified socket
   * @param socket socket to check for permissions
   */
  abstract isAllowed(socket: Socket): Promise<boolean>

  /** retrieves a clone from the current state */
  getStateClone(): { id: number } {
    return {
      id: this.id,
      //@ts-ignore
      ...Object.fromEntries(Object.keys(this.state).map((k: keyof T) => {
        const v = this.state[k]
        return [k, v instanceof Container ? v.getStateClone() : v]
      }))
    }
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
   * @returns wether the resource has been modified or not
   */
  protected set<Y extends keyof T>(name: Y, value: T[Y]) {
    if (this.equal(this.state[name], value)) return false
    this.state[name] = value
    this.emitSocket(name)
    return true
  }

  private emitSocket(name: keyof T) {
    if (!io) return
    Object.values(io.sockets.sockets).forEach(async socket => {
      if (!await this.isAllowed(socket)) return
      socket.emit(`${this.namespace}#update`, {
        id: this.id, name, value: this.state[name]
      })
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
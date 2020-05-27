import { deepStrictEqual } from "assert"

export class State<T extends State.Type> {

  private state: T

  constructor(props: T) {
    this.state = props
  }

  getState(): T {
    return <any>State.deepCopy(this.state)
  }

  update(props: State.DeepPartial<T>) {
    return State.getPaths(<any>State.updateDeep(this.state, props))
  }

  /**
   * retrieves lodash queryable paths from changes
   */
  static getPaths<
    Y extends State.Type,
    T extends State.DeepPartial<Y>
  >(changes: T, path: string[] = []) {
    const paths: [string, State.Primitives][] = []
    Object.keys(changes).forEach(k => {
      const currPath = [...path, k]
      const value = changes[k]
      if (typeof value === "object" && !Array.isArray(value)) {
        paths.push(...this.getPaths(<any>value, currPath))
      } else {
        paths.push([currPath.join("."), <any>value])
      }
    })
    return paths
  }

  /**
   * copies an object in depth
   */
  static deepCopy<T extends State.Type, Y extends State.DeepPartial<T>>(obj: T): Y {
    const copy: Y = <any>{}
    Object.keys(obj).forEach((k: keyof T & keyof Y) => {
      const value = obj[k]
      if (typeof value === "object") {
        //@ts-ignore
        copy[k] = Array.isArray(value) ? [...value] : this.deepCopy(value)
      } else {
        copy[k] = <any>value
      }
    })
    return copy
  }

  static updateDeep<
    Y extends State.Type,
    T extends State.DeepPartial<Y>
  >(current: Y, next: T) {
    const updated: State.DeepPartial<Y> = {}
    Object.keys(next).forEach((k: keyof T & keyof Y) => {
      const value = next[k]
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          if (this.equals(current[k], value)) return
          current[k] = <any>value
          updated[k] = <any>value
        } else {
          //@ts-ignore
          updated[k] = State.updateDeep(current[k], value)
        }        
      } else {
        if (current[k] === <any>value || value === undefined) return
        current[k] = <any>value
        updated[k] = <any>value
      }
    })
    return updated
  }

  /** checks if 2 variable equals */
  static equals(a: any, b: any) {
    try {
      deepStrictEqual(a, b)
      return true
    } catch (e) {
      return false
    }
  }

}

export namespace State {
  export type Primitives =
    string |
    number |
    boolean |
    undefined |
    (number|string|boolean)[]
  
  export type Type = {
    [key: string]: Primitives|Record<string, Primitives>|{}
  }

  export type DeepPartial<T extends Type> = Partial<{
    [P in keyof T]: T[P] extends Type ? DeepPartial<T[P]> : T[P]
  }>

}
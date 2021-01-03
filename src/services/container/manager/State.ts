import { deepStrictEqual } from "assert"

export class State<T extends State.Type> {

  private state: T

  constructor(props: T) {
    this.state = props
  }

  get(key?: never): T
  get<Y extends keyof T>(key: Y): T[Y]
  get<Y extends keyof T>(key?: Y): T|T[Y] {
    return State.deepCopy(key ? this.state[key] : this.state)
  }

  update(props: State.DeepPartial<T>) {
    return State.getPaths(<any>State.updateDeep(this.state, props))
  }

  all(): Readonly<T> {
    return this.state
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
      const currPath = [...path, k.replace(/\./g, "_")]
      const value = changes[k]
      if (typeof value === "object" && !Array.isArray(value)) {
        paths.push(...this.getPaths(<any>value, currPath))
      } else {
        paths.push([currPath.join("."), <any>value])
      }
    })
    return paths
  }

  /** copies an object in depth */
  static deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }

  static updateDeep<
    Y extends State.Type,
    T extends State.DeepPartial<Y>
  >(current: Y, next: T) {
    const updated: any = {}
    Object.keys(next).forEach((k: keyof T & keyof Y) => {
      const value = next[k]
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          if (this.equals(current[k], value)) return
          current[k] = <any>value
          updated[k] = <any>value
        } else {
          if (current[k] === undefined) {
            current[k] = <any>value
            updated[k] = value
          } else {
            updated[k] = State.updateDeep(<any>current[k], <any>value)
          }
        }
      } else {
        if ((k as string).includes(".")) k = (k as string).replace(/\./g, "_")
        if (current[k] === <any>value) return
        if (value === undefined) {
          delete current[k]
        } else {
          current[k] = <any>value
        }
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
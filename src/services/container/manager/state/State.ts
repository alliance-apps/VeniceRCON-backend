import { AbstractState } from "./types/Abstract"
import { BooleanType } from "./types/BooleanType"
import { NumberType } from "./types/NumberType"
import { StringType } from "./types/StringType"
import { ObjectType } from "./types/ObjectType"
import { ArrayType } from "./types/ArrayType"

export class State<T extends {}> {

  readonly state: Record<keyof T, AbstractState<any>> = <any>{}

  addProperty<Y extends keyof T>(key: Y, type: State.Type.STRING): StringType
  addProperty<Y extends keyof T>(key: Y, type: State.Type.NUMBER): NumberType
  addProperty<Y extends keyof T>(key: Y, type: State.Type.BOOLEAN): BooleanType
  addProperty<Y extends keyof T>(key: Y, type: State.Type.OBJECT): ObjectType<T[Y]>
  addProperty<Y extends keyof T>(key: Y, type: State.Type.ARRAY): ArrayType<T[Y]>
  addProperty<Y extends keyof T>(key: Y, type: State.Type) {
    if (this.state[key] instanceof AbstractState)
      throw new Error(`key with name ${key} has already been defined`)
    this.state[key] = State.fromType(type)
    return this.state[key]
  }

  getState(): T {
    return <any>Object.fromEntries(
      Object.keys(this.state).map(key => {
        const prop = this.state[key as keyof T]
        if (!(prop instanceof AbstractState))
          throw new Error(`key "${key}" is not instance of AbstractState`)
        return [key, prop.value()]
      })
    )
  }

  update(props: State.DeepPartial<T>) {
    throw new Error("not implemented")
  }

  static fromType(type: State.Type) {
    switch (type) {
      case State.Type.STRING: return new StringType()
      case State.Type.NUMBER: return new NumberType()
      case State.Type.BOOLEAN: return new BooleanType()
      case State.Type.OBJECT: return new ObjectType()
      default:
        throw new Error(`Unknown type ${type}`)
    }
  }
}

export namespace State {
  export enum Type {
    STRING,
    NUMBER,
    BOOLEAN,
    OBJECT,
    ARRAY
  }

  export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>
  }
}
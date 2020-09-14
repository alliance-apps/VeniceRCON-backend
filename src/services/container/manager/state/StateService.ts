export class StateService<T extends StateService.State> {

  readonly config: T
  private state: StateService.StateObject<T>

  constructor(props: StateService.Props<T>) {
    this.config = props.state
    this.state = StateService.buildInitialState(props.state)
  }

  get() {
    return StateService.deepCopy(this.state)
  }

  update(props: StateService.DeepPartial<StateService.StateObject<T>>) {
    
  }

  /** copies an object in depth */
  static deepCopy<Y>(obj: Y): Y {
    return JSON.parse(JSON.stringify(obj))
  }

  static buildInitialState<T extends StateService.State>(props: T): StateService.StateObject<T> {
    return Object.fromEntries(Object.keys(props).map(key => {
      const prop = props[key]
      switch (prop.type) {
        case StateService.Type.BOOLEAN:
          return [key, prop.default || false]
        case StateService.Type.NUMBER:
          return [key, prop.default || 0]
        case StateService.Type.STRING:
          return [key, prop.default || ""]
        case StateService.Type.OBJECT:
          return [key, StateService.buildInitialState(prop.state)]
        case StateService.Type.ARRAY:
          return [key, prop.default || []]
      }
    }))
  }

}

export namespace StateService {

  export interface Props<T> {
    state: T
  }

  export enum Type {
    STRING,
    NUMBER,
    BOOLEAN,
    OBJECT,
    ARRAY
  }

  export type StateInfo =
    StringState |
    NumberState |
    BooleanState |
    ObjectState |
    ArrayState


  export interface StringState {
    type: Type.STRING
    default?: string
  }

  export interface NumberState {
    type: Type.NUMBER
    default?: number
  }

  export interface BooleanState {
    type: Type.BOOLEAN
    default?: boolean
  }

  export interface ObjectState {
    type: Type.OBJECT
    default?: {}
    state: State
  }

  export interface ArrayState<T extends AcceptableType = AcceptableType> {
    type: Type.ARRAY
    state: T
    unique?: string
    default?: ExtractStateInfoType<T>[]
  }

  export type State = {
    [key: string]: AcceptableType
  }

  export type AcceptableType = StateInfo|Type

  export type ExtractStateInfoType<T extends StateInfo> =
    //@ts-ignore
    T["type"] extends Type.OBJECT ? StateObject<T["state"]> :
    //@ts-ignore
    T["type"] extends Type.ARRAY ? ExtractStateInfoType<T["state"]>[] :
    T["type"] extends Type.BOOLEAN ? boolean :
    T["type"] extends Type.NUMBER ? number :
    T["type"] extends Type.STRING ? string :
    unknown

  export type StateObject<T extends State> = {
    [P in keyof T]: (
      //@ts-ignore
      T[P]["type"] extends Type.OBJECT ? StateObject<T[P]["state"]> :
      //@ts-ignore
      T[P]["type"] extends Type.ARRAY ? ExtractStateInfoType<T[P]["state"]>[] :
      ExtractStateInfoType<T[P]>
    )
  }

  export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>
  }

}
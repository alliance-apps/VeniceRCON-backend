import { State } from "./State"
import { socketManager } from "@service/koa/socket"

export abstract class StreamingContainer<T extends State.Type> {

  abstract readonly id: number
  private state: State<T>

  constructor(state: T) {
    this.state = new State(state)
  }

  /** retrieves the current state */
  get(key?: never): StreamingContainer.State<T>
  get<Y extends keyof StreamingContainer.State<T>>(key: Y): StreamingContainer.State<T>[Y]
  get<
    Y extends keyof StreamingContainer.State<T>
  >(key?: Y): StreamingContainer.State<T>|StreamingContainer.State<T>[Y]  {
    if (key) {
      //@ts-ignore
      if (key === "id") return this.id
      //@ts-ignore
      return this.state.get(key)
    }
    return {
      id: this.id,
      ...this.state.get()
    }
  }

  /** updates an entity */
  update(props: State.DeepPartial<T>) {
    const changes = this.state.update(props)
    if (changes.length > 0) {
      socketManager
        .subscribedTo(this.id)
        .emitInstanceUpdate(this.id, changes)
    }
    return changes
  }

  /** emits a remove event */
  remove() {
    socketManager.subscribedTo(this.id).emitInstanceRemove(this.id)
  }

}

export namespace StreamingContainer {

  export type State<T extends State.Type> = T & StreamingContainer.StateDefaults

  export interface StateDefaults {
    id: number
  }

}
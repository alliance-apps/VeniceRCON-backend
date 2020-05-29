import { State } from "./State"
import { socketManager } from "@service/koa/socket"

export abstract class StreamingContainer<T extends State.Type> {

  abstract readonly id: number
  private state: State<T>

  constructor(state: T) {
    this.state = new State(state)
  }

  /** retrieves the current state */
  getState(): StreamingContainer.StateDefaults & T {
    return {
      id: this.id,
      ...this.state.getState()
    }
  }

  /** updates an entity */
  update(props: State.DeepPartial<T>) {
    const changes = this.state.update(props)
    if (changes.length > 0) socketManager.emitInstanceUpdate(this.id, changes)
    return changes
  }

  /** emits a remove event */
  remove() {
    socketManager.emitInstanceRemove(this.id)
  }

}

export namespace StreamingContainer {

  export interface StateDefaults {
    id: number
  }

}
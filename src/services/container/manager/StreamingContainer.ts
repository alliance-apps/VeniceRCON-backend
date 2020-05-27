import _ from "lodash"
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

  update(props: State.DeepPartial<T>) {
    const changes = this.state.update(props)
    socketManager.emitInstanceUpdate(this.id, changes)
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
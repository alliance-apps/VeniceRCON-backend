import _ from "lodash"
import { State } from "./State"
import IO from "socket.io"

export abstract class StreamingContainer<T extends State.Type> {

  abstract readonly namespace: string
  abstract readonly id: number
  abstract readonly room: IO.Namespace
  private state: State<T>

  constructor(state: T) {
    this.state = new State(state)
  }

  /** retrieves the current state */
  getState(): StreamingContainer.StateDefaults & T {
    return {
      id: this.id,
      namespace: this.namespace,
      ...this.state.getState()
    }
  }

  update(props: State.DeepPartial<T>) {
    const changes = this.state.update(props)
    this.room.emit("update", changes)
    return changes
  }

  /** emits a remove event */
  remove() {
    this.room.emit("remove")
  }

}

export namespace StreamingContainer {

  export interface StateDefaults {
    id: number
    namespace: string
  }

}
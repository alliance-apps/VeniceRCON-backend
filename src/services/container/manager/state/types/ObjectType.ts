import { State } from "../State"
import { AbstractState } from "./Abstract"

export class ObjectType<T> extends AbstractState<T> {

  readonly type = State.Type.OBJECT
  private state: State<T> = new State()

  update(props: State.DeepPartial<T>) {
    this.state.update(props)
  }

  value() {
    return this.state.getState()
  }

}
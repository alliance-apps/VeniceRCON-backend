import { State } from "../State"
import { AbstractState } from "./Abstract"

export class ArrayType<T extends []> extends AbstractState<T> {

  readonly type = State.Type.ARRAY
  private state: T = []

  update(value: T) {
    this.state = value
  }

  value() {
    return this.state
  }

}
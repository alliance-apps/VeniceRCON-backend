import { State } from "../State"
import { AbstractState } from "./Abstract"

export class NumberType extends AbstractState<number> {

  readonly type = State.Type.NUMBER
  private current: number = 0

  update(value: number) {
    this.current = value
  }

  value() {
    return this.current
  }

}
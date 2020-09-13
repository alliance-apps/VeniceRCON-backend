import { State } from "../State"
import { AbstractState } from "./Abstract"

export class BooleanType extends AbstractState<boolean> {

  readonly type = State.Type.BOOLEAN
  private current: boolean = false

  update(value: boolean) {
    this.current = value
  }

  value() {
    return this.current
  }

}
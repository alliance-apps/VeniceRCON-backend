import { State } from "../State"
import { AbstractState } from "./Abstract"

export class StringType extends AbstractState<string> {

  readonly type = State.Type.STRING
  private current: string = ""

  update(value: string) {
    this.current = value
  }

  value() {
    return this.current
  }
}
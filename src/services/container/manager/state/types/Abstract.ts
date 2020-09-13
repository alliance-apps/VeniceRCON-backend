import { State } from "../State"

export abstract class AbstractState<T> {

  abstract readonly type: State.Type

  abstract update(value: T): void
  abstract value(): T
}
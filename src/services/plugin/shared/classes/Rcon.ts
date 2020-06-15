import { SharedClass } from "./SharedClass"
import { Battlefield } from "vu-rcon"
import { Messenger } from "../Messenger"

export class SharedRcon extends SharedClass<Battlefield> {

  constructor(props: SharedRcon.Props) {
    super({
      type: Battlefield,
      messenger: props.messenger,
      parent: props.rcon,
      namespace: "RCON#"
    })
  }

  static create(props: SharedRcon.Props): SharedRcon & Battlefield {
    return new SharedRcon(props) as SharedRcon & Battlefield
  }
}

export namespace SharedRcon {
  export interface Props {
    rcon?: Battlefield
    messenger: Messenger
  }
}
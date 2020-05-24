import { Container } from "./Container"
import { Battlefield } from "vu-rcon"

export class ServerInfoContainer extends Container<ServerInfoContainer.State> {

  readonly namespace = "serverinfo"
  readonly id: number

  constructor(props: ServerInfoContainer.IProps) {
    super(props.state)
    this.id = props.parentId
  }

  /**
   * updates the serverinfo data
   */
  updateServerInfo<
    Y extends ServerInfoContainer.State,
    K extends keyof Y
  >(info: Y): K[] {
    //@ts-ignore
    return Object.keys(info)
      //@ts-ignore
      .filter((key: K) => this.set(key, info[key]))
  }

}

export namespace ServerInfoContainer {

  export type State = Partial<Battlefield.ServerInfo>

  export interface IProps {
    state: State
    parentId: number
  }

}
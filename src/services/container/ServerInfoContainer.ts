import { Container } from "./Container"
import { Battlefield } from "vu-rcon"
import { Socket } from "socket.io"
import { permissionManager } from "@service/permissions"
import { InstanceScope } from "@service/permissions/Scopes"

export class ServerInfoContainer extends Container<ServerInfoContainer.State> {

  readonly namespace = "serverinfo"
  readonly id: number

  constructor(props: ServerInfoContainer.IProps) {
    super(props.state)
    this.id = props.parentId
  }

  async isAllowed(socket: Socket) {
    if (!socket.request.user || !socket.request.user.logged_in) return false
    return permissionManager.hasPermission({
      user: socket.request.user.user.id,
      instance: this.id,
      scope: InstanceScope.ACCESS
    })
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
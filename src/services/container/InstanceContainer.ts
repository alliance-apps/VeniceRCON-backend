import { Instance } from "../battlefield/Instance"
import { Container } from "./Container"
import { Instance as InstanceEntity } from "@entity/Instance"
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity"
import { Battlefield } from "vu-rcon"
import { ServerInfoContainer } from "./ServerInfoContainer"
import { Socket } from "socket.io"
import { permissionManager } from "@service/permissions"
import { Permission } from "@entity/Permission"

export class InstanceContainer extends Container<InstanceContainer.StateProps> {

  readonly namespace = "instance"
  readonly id: number

  constructor(props: InstanceContainer.IProps) {
    super({
      host: props.entity.host,
      port: props.entity.port,
      state: Instance.State.DISCONNECTED,
      serverinfo: new ServerInfoContainer({
        parentId: props.entity.id, state: {}
      }),
    })
    this.id = props.entity.id
  }

  async isAllowed(socket: Socket) {
    if (!socket.request.user || !socket.request.user.logged_in) return false
    return permissionManager.hasPermission({
      user: socket.request.user.user.id,
      instance: this.id,
      scope: Permission.Instance.ACCESS
    })
  }

  /**
   * updates the database object
   * @param props
   */
  private updateEntity(props: QueryDeepPartialEntity<InstanceEntity>) {
    return InstanceEntity
      .createQueryBuilder()
      .update()
      .set(props)
      .where({ id: this.id })
      .execute()
  }

  /**
   * updates serverinfo data
   * @param info
   */
  async updateServerInfo(info: Battlefield.ServerInfo) {
    if (this.state.serverinfo.updateServerInfo(info).includes("name")) {
      await this.updateEntity({ name: info.name })
    }
    return this
  }

  /**
   * updates the connection
   * @param host 
   * @param port 
   */
  async updateConnection(host: string, port: number) {
    this.set("host", host)
    this.set("port", port)
    await this.updateEntity({ host, port })
    return this
  }

  /**
   * updates the battlefield instance current connection state
   * @param state state to set instance to
   */
  async updateState(state: Instance.State) {
    this.set("state", state)
    return this
  }

}

export namespace InstanceContainer {

  export interface StateProps {
    host: string
    port: number
    state: Instance.State
    serverinfo: ServerInfoContainer
  }

  export interface IProps {
    entity: InstanceEntity
  }
}
import { Instance } from "../battlefield/Instance"
import { Instance as InstanceEntity } from "@entity/Instance"
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity"
import { Battlefield } from "vu-rcon"
import { StreamingContainer } from "./manager/StreamingContainer"
import IO from "socket.io"
import { io } from "@service/koa/socket"
import { State } from "./manager/State"

export class InstanceContainer extends StreamingContainer<InstanceContainer.State> {

  readonly namespace = "INSTANCE"
  readonly id: number
  readonly room: IO.Namespace

  constructor(props: InstanceContainer.IProps) {
    super({
      host: props.entity.host,
      port: props.entity.port,
      state: Instance.State.DISCONNECTED,
      serverinfo: {},
    })
    this.id = props.entity.id
    this.room = io.to(`${this.namespace}#${this.id}`)
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
  async updateServerInfo(serverinfo: Battlefield.ServerInfo) {
    const changes = this.update({ serverinfo })
    const change = changes.find(change => change[0] === "serverinfo.name")
    if (change) await this.updateEntity({ name: <string>change[1] })
    return this
  }

  /**
   * updates the connection
   * @param host 
   * @param port 
   */
  async updateConnection(host: string, port: number) {
    await this.updateEntity({ host, port })
    this.update({ host, port })
    return this
  }

  /**
   * updates the battlefield instance current connection state
   * @param state state to set instance to
   */
  async updateConnectionState(state: Instance.State) {
    this.update({ state })
    return this
  }

}

export namespace InstanceContainer {

  export interface State extends State.Type {
    host: string
    port: number
    state: Instance.State
    serverinfo: Battlefield.ServerInfo|{}
  }

  export interface IProps {
    entity: InstanceEntity
  }
}
import { Instance } from "../battlefield/Instance"
import { Instance as InstanceEntity } from "@entity/Instance"
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity"
import { Battlefield } from "vu-rcon"
import { StreamingContainer } from "./manager/StreamingContainer"
import { State } from "./manager/State"

export class InstanceContainer extends StreamingContainer<InstanceContainer.State> {

  readonly id: number

  constructor(props: InstanceContainer.IProps) {
    super({
      host: props.entity.host,
      port: props.entity.port,
      state: Instance.State.DISCONNECTED,
      serverinfo: props.serverinfo || {},
      players: {},
      maps: [],
      mapInfo: { index: 0, next: 0 }
    })
    this.id = props.entity.id
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
   * updates maplist data
   * @param maps
   */
  async updateMapList(maps: Battlefield.MapList) {
    this.update({ maps })
    return this
  }

  /**
   * updates current and next playing map
   * @param mapInfo maps which is currently running and which is coming next
   */
  async updateMapIndex(mapInfo: { index: number, next: number }) {
    this.update({ mapInfo })
    return this
  }

  /**
   * updates serverinfo data
   * @param info
   */
  async updatePlayers(players: Battlefield.Player[]) {
    const obj: Record<string, Battlefield.Player|undefined> = Object.fromEntries(players.map(p => [p.guid, p]))
    const guids = Object.keys(obj)
    Object.keys(this.getState().players).forEach(guid => {
      if (guids.includes(guid)) return
      obj[guid] = undefined
    })
    this.update({ players: obj })
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
  updateConnectionState(state: Instance.State) {
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
    players: Record<string, Battlefield.Player>
    maps: Battlefield.MapList
    mapInfo: {
      index: number
      next: number
    }
  }

  export interface IProps {
    entity: InstanceEntity
    serverinfo?: Battlefield.ServerInfo
  }
}
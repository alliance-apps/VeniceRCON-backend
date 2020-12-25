import { Instance } from "../battlefield/libs/Instance"
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
      name: props.parent.name,
      serverinfo: props.serverinfo || {},
      players: {},
      maps: [],
      version: (() => {
        switch (props.entity.version) {
          case "VU": return InstanceContainer.Version.VU
          case "BF3":
          default: return InstanceContainer.Version.BF3
        }
      })(),
      vars: {},
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
    this.update({ serverinfo, name: serverinfo.name })
    return this
  }

  /**
   * updates variables from the container
   * @param namespace namespace to save variables under
   * @param entries entries to save
   */
  updateVars(entries: Record<string, any>) {
    const { vars } = this.get()
    this.update({ vars: { ...vars, ...entries } })
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
   * partially updates a player
   * @param guid guid of the player to change
   * @param props props to change
   */
  updatePlayerPropsByGuid(guid: string, props: Partial<Battlefield.Player>) {
    const player = this.get("players")[guid]
    if (!player) return false
    return this.updatePlayerProps(player, props)
  }

  /**
   * partially updates a player
   * @param name of the player
   * @param props props to change
   */
  updatePlayerPropsByName(name: string, props: Partial<Battlefield.Player>) {
    const player = Object.values(this.get("players")).find(p => p.name === name)
    if (!player) return false
    return this.updatePlayerProps(player, props)
  }

  private updatePlayerProps(player: Battlefield.Player, props: Partial<Battlefield.Player>) {
    this.update({ players: { [player.guid]: {...player, ...props } } })
    return true
  }

  /**
   * updates serverinfo data
   * @param info
   */
  updatePlayers(players: Battlefield.Player[]) {
    const obj: Record<string, Battlefield.Player|undefined> = Object.fromEntries(players.map(p => [p.guid, p]))
    const guids = Object.keys(obj)
    Object.keys(this.get("players")).forEach(guid => {
      if (guids.includes(guid)) return
      obj[guid] = undefined
    })
    this.update({ players: obj })
    return this
  }

  /** removes a single player from the array */
  removePlayer(guid: string) {
    const players = this.get("players")
    this.update({
      players: Object.fromEntries(
        Object.keys(players)
          .filter(g => g !== guid)
          .map(g => [g, players[g]])
      )
    })
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

  async updateGameVersion(version: InstanceContainer.Version) {
    this.update({ version })
    await InstanceEntity.update({ id: this.id }, { version })
  }

}

export namespace InstanceContainer {

  export interface State extends State.Type {
    host: string
    port: number
    state: Instance.State
    name: string
    serverinfo: Partial<Battlefield.ServerInfo>
    players: Record<string, Battlefield.Player>
    maps: Battlefield.MapList
    version: InstanceContainer.Version
    vars: Record<string, string|number|boolean>
    mapInfo: {
      index: number
      next: number
    }
  }

  export interface IProps {
    entity: InstanceEntity
    parent: Instance
    serverinfo?: Battlefield.ServerInfo
  }

  export enum Version {
    BF3 = "BF3",
    VU = "VU"
  }
}
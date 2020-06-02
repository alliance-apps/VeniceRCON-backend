import { Socket } from "./Socket"
import io from "socket.io"

export class SocketManager {

  sockets: Socket[] = []
  private io: io.Server

  constructor(server: io.Server) {
    this.io = server
  }

  /**
   * adds a new connected socket
   * @param socket
   */
  add(socket: io.Socket) {
    this.sockets.push(new Socket({
      socket,
      userId: socket.request.user.user.id,
      handleClose: (sock: Socket) => this.sockets = this.sockets.filter(s => s !== sock)
    }))
  }

  async checkAccess() {
    await Promise.all(this.sockets.map(s => s.checkAccess()))
  }

  /**
   * sends an update for the specified instance
   * @param id the instance id the update is for
   * @param changes changes to commit
   */
  emitInstanceUpdate(id: number, changes: [string, any][]) {
    this.io
      .to(SocketManager.getInstanceRoomName(id))
      .emit(SocketManager.INSTANCE.UPDATE, { id, changes })
  }

  emitInstanceRemove(id: number) {
    this.sockets.forEach(s => s.removeInstance(id))
  }

  /**
   * retrieves all connected sockets by a specific user id
   * @param userId
   */
  getSocketsByUserId(userId: number) {
    return this.sockets.filter(s => s.userId === userId)
  }

  static getInstanceRoomName(id: number) {
    return `${SocketManager.INSTANCE.NAMESPACE}#${id}`
  }

}

export namespace SocketManager {

  export enum INSTANCE {
    NAMESPACE = "INSTANCE",
    UPDATE = "INSTANCE#UPDATE",
    REMOVE = "INSTANCE#REMOVE",
    ADD = "INSTANCE#ADD",
  }

  export enum SELF {
    NAMESPACE = "SELF",
    PERMISSION_UPDATE = "SELF#PERMISSION_UPDATE"
  }

}
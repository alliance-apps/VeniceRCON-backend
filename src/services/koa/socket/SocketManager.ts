import { Socket } from "./Socket"
import io from "socket.io"
import { SocketPool } from "./SocketPool"

export class SocketManager extends SocketPool {

  /**
   * adds a new connected socket
   * @param socket
   */
  connect(socket: io.Socket) {
    this.add(new Socket({
      socket,
      //@ts-ignore - find a way to add user to http.IncomingMessage
      userId: socket.request.user.id,
      handleClose: socket => this.remove(socket)
    }))
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
    CHAT = "INSTANCE#CHAT",
    KILL = "INSTANCE#KILL",
    LOG = "INSTANCE#LOG",
    CONSOLE = "INSTANCE#CONSOLE"
  }

  export enum SELF {
    NAMESPACE = "SELF",
    PERMISSION_UPDATE = "SELF#PERMISSION_UPDATE"
  }

}
import { Socket as IOSocket } from "socket.io"
import { instanceManager } from "@service/battlefield"
import { InstanceScope } from "@service/permissions/Scopes"
import { Instance } from "@service/battlefield/Instance"

export class Socket {

  static INSTANCE_NAMESPACE = `INSTANCE#`

  readonly socket: IOSocket
  readonly userId: number
  private instances: number[] = []

  constructor(props: Socket.IProps) {
    this.socket = props.socket
    this.userId = props.userId
    this.socket.once("disconnect", () => props.handleClose(this))
    this.initalize()
  }

  private async initalize() {
    const instances = await instanceManager.getInstancesWithPermissions(this.userId, InstanceScope.ACCESS)
    instances.forEach(instance => this.addInstance(instance))
  }

  static getInstanceRoomName(id: number) {
    return `${Socket.INSTANCE_NAMESPACE}${id}`
  }

  /**
   * subscribes the socket to an instance and sends the initial state
   * @param state initial state to send
   */
  addInstance(instance: Instance) {
    this.instances.push(instance.id)
    const name = Socket.getInstanceRoomName(instance.id)
    this.socket.join(name, () => {
      this.socket.emit(`${Socket.INSTANCE_NAMESPACE}add`, instance.getState())
    })
  }

  /**
   * removes a socket from a room
   * @param id instance id to remove to user from
   */
  removeInstance(id: number) {
    this.instances = this.instances.filter(i => i !== id)
    const name = Socket.getInstanceRoomName(id)
    this.socket.in(name).emit("remove")
    this.socket.leave(name)
  }


}

export namespace Socket {
  
  export interface IProps {
    socket: IOSocket
    userId: number
    handleClose: (socket: Socket) => void
  }

}
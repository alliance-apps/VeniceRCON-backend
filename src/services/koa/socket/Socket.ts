import { Socket as IOSocket } from "socket.io"
import { instanceManager } from "@service/battlefield"
import { InstanceScope } from "@service/permissions/Scopes"
import { Instance } from "@service/battlefield/libs/Instance"
import { SocketManager } from "./SocketManager"
import { permissionManager } from "@service/permissions"
import { ChatMessage } from "@entity/ChatMessage"
import { Kill } from "@entity/Kill"

export class Socket {

  readonly socket: IOSocket
  readonly userId: number
  private instances: number[] = []

  constructor(props: Socket.IProps) {
    this.socket = props.socket
    this.userId = props.userId
    this.socket.once("disconnect", () => {
      this.socket.removeAllListeners()
      props.handleClose(this)
    })
    this.checkAccess()
  }

  /**
   * checks if a socket is subscribed to a specific instance
   * @param instanceId instance to check
   */
  isSubscribedTo(instanceId: number) {
    return this.instances.includes(instanceId)
  }

  /** checks access to all instances the user has and (un)subscribes if needed */
  async checkAccess() {
    const instances = await instanceManager.getInstancesWithPermissions(this.userId, InstanceScope.ACCESS)
    const access = [...this.instances]
    instances.map(instance => {
      if (access.includes(instance.id)) {
        access.splice(access.indexOf(instance.id), 1)
      } else {
        this.addInstance(instance)
      }
    })
    access.forEach(id => this.removeInstance(id))
    this.socket.emit(SocketManager.SELF.PERMISSION_UPDATE)
  }

  /**
   * subscribes the socket to an instance and sends the initial state
   * @param state initial state to send
   */
  addInstance(instance: Instance|number) {
    const id = typeof instance === "number" ? instance : instance.id
    if (this.instances.includes(id)) return
    this.instances.push(id)
    this.socket.join(SocketManager.getInstanceRoomName(id), async () => {
      const instance = instanceManager.getInstanceById(id)
      this.socket.emit(SocketManager.INSTANCE.ADD, {
        state: instance.state.get()
      })
      this.emitChatMessages(await instance.chat.getMessages())
    })
  }

  /**
   * removes a socket from a room
   * @param id instance id to remove to user from
   */
  removeInstance(id: number) {
    this.instances = this.instances.filter(i => i !== id)
    const name = SocketManager.getInstanceRoomName(id)
    this.socket.emit(SocketManager.INSTANCE.REMOVE, { id })
    this.socket.leave(name)
  }

  /**
   * chat message
   * @param instanceId
   * @param scope
   */
  async emitChatMessages(messages: ChatMessage[]) {
    this.socket.emit(
      SocketManager.INSTANCE.CHAT,
      { messages: await Promise.all(messages.map(message => message.toJSON())) }
    )
  }

  async emitKill(kills: Kill[]) {
    this.socket.emit(
      SocketManager.INSTANCE.KILL,
      { kills: await Promise.all(kills.map(kill => kill.toJSON())) }
    )
  }

  /**
   * checks if the socket has permission to a specific instance and scope
   * @param instanceId instance to check
   * @param scope scope the user should have
   */
  async hasPermission(instanceId: number, scope: bigint) {
    return permissionManager.hasPermission({
      user: this.userId, instance: instanceId, scope
    })
  }


}

export namespace Socket {

  export interface IProps {
    socket: IOSocket
    userId: number
    handleClose: (socket: Socket) => void
  }

}
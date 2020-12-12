import { Socket as IOSocket } from "socket.io"
import { instanceManager } from "@service/battlefield"
import { InstanceScope } from "@service/permissions/Scopes"
import { Instance } from "@service/battlefield/libs/Instance"
import { SocketManager } from "./SocketManager"
import { permissionManager } from "@service/permissions"
import { ChatMessage } from "@entity/ChatMessage"
import { Kill } from "@entity/Kill"
import { LogMessage } from "@entity/LogMessage"
import winston from "winston"

export class Socket {

  readonly socket: IOSocket
  readonly userId: number
  private instances: number[] = []
  private features: Socket.Features = {
    raw: []
  }

  constructor(props: Socket.IProps) {
    this.socket = props.socket
    this.userId = props.userId
    this.socket.once("disconnect", () => {
      this.socket.removeAllListeners()
      props.handleClose(this)
    })
    this.socket.on(SocketManager.SELF.CMD_FEATURE, this.onFeatureCommand.bind(this))
    this.checkAccess()
  }

  /** handles feature requests for this sockets */
  private onFeatureCommand(data: any) {
    if (typeof data !== "object" || typeof data.name !== "string")
      return winston.verbose(`invalid socket payload for "feature" from user ${this.userId}`)
    switch (data.name) {
      //enables raw console messages
      case "raw":
        if (typeof data.instance !== "number" || typeof data.set !== "boolean")
        return winston.verbose(`invalid socket payload for "feature" from user ${this.userId}`)
        if (data.set) {
          if (this.features.raw.includes(data.instance)) return
          this.features.raw.push(data.instance)
        } else {
          this.features.raw = this.features.raw.filter(id => id !== data.instance)
        }
        return
      //catch all for unknown feature commands
      default:
        return winston.verbose(`unknown name in socket "feature" command from user ${this.userId}: "${data.name}"`)
    }
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
    instances.forEach(instance => {
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
  async addInstance(instance: Instance|number) {
    instance = typeof instance === "number" ? instanceManager.getInstanceById(instance) : instance
    if (this.instances.includes(instance.id)) return
    this.instances.push(instance.id)
    await this.socket.join(SocketManager.getInstanceRoomName(instance.id))
    this.socket.emit(SocketManager.INSTANCE.ADD, { state: instance.state.get() })
    this.emitChatMessages(await instance.chat.getMessages())
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

  emitInstanceUpdate(id: number, changes: [string, any][]) {
    this.socket.emit(
      SocketManager.INSTANCE.UPDATE,
      { id, changes }
    )
  }

  emitInstanceLogMessages(messages: LogMessage[]) {
    this.socket.emit(
      SocketManager.INSTANCE.LOG,
      { messages: messages.map(msg => msg.toJSON()) }
    )
  }

  emitConsoleMessage(message: Socket.ConsoleMessage) {
    if (!this.features.raw.includes(message.id)) return
    this.socket.emit(SocketManager.INSTANCE.CONSOLE, message)
  }

  /**
   * checks if the socket has permission to a specific instance and scope
   * @param instanceId instance to check
   * @param scope scope the user should have
   */
  async hasPermission(instanceId: number, scope: bigint) {
    return permissionManager.hasPermissions({
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

  export type Features = {
    //instances for which the raw tcp messages should get sent
    raw: number[]
  }

  export interface ConsoleMessage {
    //instanceid
    id: number
    //wether the message has been sent or received
    type: "send"|"receive"
    //data content
    words: string[]
  }

}
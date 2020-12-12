import { Socket } from "./Socket"
import { ChatMessage } from "@entity/ChatMessage"
import { Kill } from "@entity/Kill"
import { LogMessage } from "@entity/LogMessage"

export class SocketPool {

  private sockets: Socket[] = []

  constructor(sockets?: Socket[]) {
    if (sockets) this.sockets = sockets
  }

  /** adds a socket to the pool */
  add(socket: Socket) {
    this.sockets.push(socket)
    return this
  }

  /** removes a socket from the pool */
  remove(socket: Socket) {
    this.sockets = this.sockets.filter(s => s !== socket)
    return this
  }

  checkAccess() {
    return Promise.all(this.sockets.map(s => s.checkAccess()))
  }

  emitInstanceRemove(id: number) {
    this.sockets.forEach(s => s.removeInstance(id))
  }

  emitChatMessages(messages: ChatMessage[]) {
    this.sockets.forEach(s => s.emitChatMessages(messages))
  }

  emitKill(kills: Kill[]) {
    this.sockets.forEach(s => s.emitKill(kills))
  }

  emitInstanceLogMessages(entities: LogMessage[]) {
    this.sockets.forEach(s => s.emitInstanceLogMessages(entities))
  }

  emitConsoleMessage(message: Socket.ConsoleMessage) {
    this.sockets.forEach(s => s.emitConsoleMessage(message))
  }

  emitInstanceUpdate(id: number, changes: [string, any][]) {
    this.sockets.forEach(s => s.emitInstanceUpdate(id, changes))
  }

  /** retrieves all connected sockets by a specific user id */
  getSocketsByUserId(userId: number) {
    return new SocketPool(this.sockets.filter(s => s.userId === userId))
  }

  subscribedTo(instanceId: number) {
    return new SocketPool(this.sockets.filter(s => s.isSubscribedTo(instanceId)))
  }

  /** retrieves all sockets for an instance with certain permissions */
  hasPermission(instanceId: number, permission: bigint) {
    return new SocketPool(
      this.subscribedTo(instanceId).sockets.filter(s => s.hasPermission(instanceId, permission))
    )
  }

  /** emits a message to all sockets in this pool */
  emit(event: string, data: any) {
    this.sockets.forEach(s => s.socket.emit(event, data))
  }

  /** retrieves all sockets which has a specific permission scope for an instance */
  async getSocketsWithPermission(instanceId: number, scope: bigint) {
    const pool = new SocketPool()
    await Promise.all(this.sockets.map(async s => {
      if (await s.hasPermission(instanceId, scope)) pool.add(s)
    }))
    return pool
  }

}

export namespace SocketPool {

}
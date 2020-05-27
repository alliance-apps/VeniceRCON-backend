import { Server } from "socket.io"
import ioJWT from "socketio-jwt-auth"
import { User } from "@entity/User"
import { getSecret } from "../jwt"
import { SocketManager } from "./SocketManager"

export let socketManager: SocketManager

export async function initialize(server: Server) {

  socketManager = new SocketManager(server)
  
  server.use(
    ioJWT.authenticate({ secret: await getSecret() },
    async (payload, done) => {
      if (!payload || !payload.id) return done(null, false, "user does not exist")
      const user = await User.findOne({ id: payload.id })
      if (!user) return done(null, false, "user does not exist")
      return done(null, { user })
    }
  ))

  server.on("connection", async socket => {
    if (!socket.request.user) throw new Error("user not authenticated but came till connection")
    socket.emit("success")
    socketManager.add(socket)
  })

}
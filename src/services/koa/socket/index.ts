import { Server } from "socket.io"
import ioJWT from "socketio-jwt-auth"
import { User } from "@entity/User"
import { getSecret } from "../jwt"
import { Socket } from "./Socket"

export let io: Server
export let sockets: Socket[]

export async function initialize(server: Server) {

  io = server
  
  io.use(
    ioJWT.authenticate({ secret: await getSecret() },
    async (payload, done) => {
      if (!payload || !payload.id) return done(null, false, "user does not exist")
      const user = await User.findOne({ id: payload.id })
      if (!user) return done(null, false, "user does not exist")
      return done(null, { user })
    }
  ))

  io.on("connection", async socket => {
    if (!socket.request.user) throw new Error("user not authenticated but came till connection")
    socket.emit("success")
    sockets.push(new Socket({
      socket,
      userId: socket.request.user.user.id,
      handleClose: (socket: Socket) => sockets = sockets.filter(s => s !== socket)
    }))
  })

}
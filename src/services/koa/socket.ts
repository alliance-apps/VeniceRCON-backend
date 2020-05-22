import { Server } from "socket.io"
import ioJWT from "socketio-jwt-auth"
import { User } from "@entity/User"
import { getSecret } from "./jwt"
import { instanceManager } from "@service/battlefield"
import { getContainerState, getContainerNamespaces } from "@service/container"

export let io: Server

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

  io.on("connection", socket => {
    socket.emit("success")
  
    getContainerNamespaces().forEach(ns => {
      socket.emit(`${ns}#initial`, getContainerState(ns))
    })

  })

}
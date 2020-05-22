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

    socket.on("Instance#create", async (props, cb) => {
      if (!props.host || !props.port || !props.password)
        return cb({ _error: "missing property" })
      try {
        await instanceManager.addInstance({
          host: props.host,
          port: props.port,
          password: props.password
        })
        cb({ props })
      } catch (e) {
        cb({ _error: e.message })
      }
    })

    socket.on("Instance#delete", async (props, cb) => {
      if (!props.id) return cb({ _error: "missing property" })
      try {
        await instanceManager.removeInstance(props.id)
        cb()
      } catch (e) {
        cb({ _error: e.message })
      }
    })

    socket.on("Instance#stop", async (props, cb) => {
      if (!props.id) return cb({ _error: "missing property" })
      try {
        const instance = instanceManager.getInstanceById(props.id)
        if (!instance) return cb({ _error: "instance not found" })
        await instance.stop()
        cb()
      } catch (e) {
        cb({ _error: e.message })
      }
    })

    socket.on("Instance#start", async (props, cb) => {
      if (!props.id) return cb({ _error: "missing property" })
      try {
        const instance = instanceManager.getInstanceById(props.id)
        if (!instance) return cb({ _error: "instance not found" })
        await instance.start()
        cb()
      } catch (e) {
        cb({ _error: e.message })
      }
    })

  })

}
import { User } from "@entity/User"

interface Request {
  user: User
}

declare namespace SocketIO {

  interface Socket {
    request: Request
  }
}
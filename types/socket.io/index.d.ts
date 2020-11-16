import { User } from "@entity/User"

declare namespace http {

  interface IncomingMessage {
    user: User
  }

}
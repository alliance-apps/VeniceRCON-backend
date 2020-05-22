import "reflect-metadata"
import { randomBytes } from "crypto"
import { createConnection, Connection } from "typeorm"
import { Instance } from "@entity/Instance"
import { User, UserType } from "@entity/User"
import { Config } from "@entity/Config"

export let connection: Connection

export async function connect() {
  connection = await createConnection({
    type: "mariadb",
    synchronize: true,
    maxQueryExecutionTime: 200,
    host: process.env.TYPEORM_HOST || "127.0.0.1",
    port: parseInt(process.env.TYPEORM_PORT||"") || 3306,
    username: process.env.TYPEORM_USERNAME || "battlefield",
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE || "battlefield",
    entities: [
      Instance,
      User,
      Config
    ]
  })

  //create default user
  if (!await User.findOne({ username: "admin" })) {
    const password = randomBytes(15).toString("base64")
    await User.from({
      username: "admin",
      password,
      permissions: 0xFFFFFFFF,
      type: UserType.PROTECTED
    })
    console.log(`created default user "admin" with password "${password}"`)
  }

  //create 
  const configs = await Config.find()
  await Promise.all(
    Config.DEFAULTS
      .filter(({ name }) => !configs.map(c => c.name).includes(name))
      .map(c => Config.from(c))
  )
}
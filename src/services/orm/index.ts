import "reflect-metadata"
import { randomBytes } from "crypto"
import { createConnection, Connection } from "typeorm"
import { Instance } from "@entity/Instance"
import { User, UserType } from "@entity/User"
import { Config } from "@entity/Config"
import { config } from "@service/config"

export let connection: Connection

export async function connect() {
  connection = await createConnection({
    type: config.database.use,
    synchronize: true,
    maxQueryExecutionTime: 200,
    ...config.database[config.database.use] as any,
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
import "reflect-metadata"
import { randomBytes } from "crypto"
import { createConnection, Connection } from "typeorm"
import { Instance } from "@entity/Instance"
import { User } from "@entity/User"
import { Config } from "@entity/Config"
import { config } from "@service/config"
import { Permission } from "@entity/Permission"
import { createToken } from "@service/koa/jwt"
import { Invite } from "@entity/Invite"

export let connection: Connection

export async function connect() {
  connection = await createConnection({
    type: config.database.use,
    synchronize: true,
    logging: config.development,
    maxQueryExecutionTime: 200,
    ...config.database[config.database.use] as any,
    entities: [
      Instance,
      User,
      Config,
      Permission,
      Invite
    ]
  })

  //create default configuration
  const configs = await Config.find()
  await Promise.all(
    Config.DEFAULTS
      .filter(({ name }) => !configs.map(c => c.name).includes(name))
      .map(c => Config.from(c))
  )

  //create default user
  if (!await User.findOne({ username: "admin" })) {
    const password = randomBytes(15).toString("base64")
    const user = await User.from({ username: "admin", password })
    await user.save()
    await Permission.from({
      user, root: true, mask: Array(32).fill("ff").join(":")
    })
    setTimeout(async () => {
      console.log(`created default user "admin" with password "${password}"`)
      console.log(`jwt token: ${await createToken({ user })}`)
    }, 1000)
  }
}
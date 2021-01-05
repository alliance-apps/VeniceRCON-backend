import "reflect-metadata"
import { randomBytes } from "crypto"
import { createConnection, Connection } from "typeorm"
import winston from "winston"
import { WinstonLogger } from "./WinstonLogger"
import chalk from "chalk"
import { Instance } from "@entity/Instance"
import { User } from "@entity/User"
import { Config } from "@entity/Config"
import { config } from "@service/config"
import { Permission } from "@entity/Permission"
import { createToken } from "@service/koa/jwt"
import { Invite } from "@entity/Invite"
import { Plugin } from "@entity/Plugin"
import { Player } from "@entity/Player"
import { ChatMessage } from "@entity/ChatMessage"
import { Kill } from "@entity/Kill"
import { Weapon } from "@entity/Weapon"
import { LogMessage } from "@entity/LogMessage"
import { PluginStore } from "@entity/PluginStore"
import { getBitMaskWithAllPermissions } from "@service/permissions/Scopes"
import { migrations } from "./migrations"

export const DEFAULT_USERNAME = "admin"

export let connection: Connection

export async function connect(args: Record<string, string>) {
  connection = await createConnection({
    type: config.database.use,
    logging: config.logging.orm,
    maxQueryExecutionTime: 200,
    ...config.database[config.database.use] as any,
    charset: "utf8mb4",
    logger: new WinstonLogger(),
    entities: [
      Instance,
      PluginStore,
      User,
      Config,
      Permission,
      Invite,
      Plugin,
      Player,
      ChatMessage,
      Kill,
      Weapon,
      LogMessage
    ]
  })

  await migrations(connection)

  //create and update default "admin" user
  let admin = await User.findOne({ username: DEFAULT_USERNAME })
  if (!admin) {
    const password = randomBytes(15).toString("base64")
    admin = await User.from({ username: DEFAULT_USERNAME, password })
    await admin.save()
    setTimeout(async () => {
      if (!admin) throw new Error(`${DEFAULT_USERNAME} user not defined`)
      const token = await createToken({ user: admin })
      winston.info(`created default user "${chalk.red.bold(DEFAULT_USERNAME)}" with password "${chalk.red.bold(password)}"`)
      winston.info(`jwt token: ${chalk.red.bold(token)}`)
    }, 1000)
  }

  //find permission node
  let permission = await Permission.findOne({ userId: admin.id, root: true })
  if (!permission) permission = await Permission.from({ user: admin, root: true, mask: 0n })
  //update it and assign all permissions
  permission.mask = getBitMaskWithAllPermissions()
  await permission.save()

  if (Object.keys(args).includes("--override-password")) {
    const password = args["--override-password"]
    if (password.length < 6) throw new Error(`override password should have a minimum length of 6 characters! (got ${password.length})`)
    await admin.updatePassword(password)
    await admin.save()
    winston.info(`${DEFAULT_USERNAME} password has been overwritten`)
  }
}
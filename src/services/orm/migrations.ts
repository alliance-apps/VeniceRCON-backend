import { Connection, QueryRunner, TableColumn } from "typeorm"
import { config } from "@service/config"
import { Config } from "./entity/Config"
import winston from "winston"
import { PluginStore, PluginStoreType } from "./entity/PluginStore"
import { Plugin } from "./entity/Plugin"


export const CURRENT_DB_VERSION = 3

/**
 * runs a custom migration on a database with final synchronisation
 * @param connection typeorm connection
 */
export async function migrations(connection: Connection) {
  const queryRunner = connection.createQueryRunner()
  if (!await queryRunner.hasTable("config")) return synchronize(connection)
  const { value } = await queryRunner.manager.getRepository(Config).findOneOrFail({ name: "dbversion" })
  let version = parseInt(value, 10)
  if (isNaN(version)) throw new Error(`received invalid value from db version "${value}"`)
  if (version > CURRENT_DB_VERSION) throw new Error("current db version is too high for this application")
  while (version++ < CURRENT_DB_VERSION) {
    winston.info(`DATABASE MIGRATION (${version-1} -> ${version})`)
    const cb = migrationMap[version]
    if (typeof cb !== "function") throw new Error(`invalid migration version ${version}`)
    try {
      await cb(queryRunner)
      await queryRunner.manager.getRepository(Config)
        .createQueryBuilder()
        .update()
        .set({ value: String(version) })
        .where({ name: "dbversion" })
        .execute()
    } catch (e) {
      winston.error("well... this is reallyyyy bad")
      throw e
    }
    winston.info(`DATABASE MIGRATION ${version} OK`)
  }
}

//migration maps, the key is the version it gets upgraded to
export const migrationMap: Record<number, (runner: QueryRunner) => Promise<void>> = {
  /** includes refactor of plugin store */
  2: toV2,
  /** includes resize of configuration entry */
  3: toV3,
}

async function toV2(runner: QueryRunner) {
  const stores = await runner.query("SELECT * FROM plugin_store")
  const formatted = stores.map((store: any) => {
    const { url, branch, type } = store
    if (type !== "GITHUB_PROVIDER") throw new Error(`received unknown store type ${type} expected "GITHUB_PROVIDER"`)
    const regex = /^https:\/\/github\.com\/(.+)\/(.+)$/
    const match = url.match(regex)
    const username = match[1]
    const repository = match[2]
    if (!match) throw new Error(`could not match provider url ${url} against ${regex}`)
    return [store.id, `${JSON.stringify({ username, repository, branch })}`]
  })
  await runner.addColumn("plugin_store", new TableColumn({
    name: "options", default: "'{}'", type: "varchar", length: "512"
  }))
  await runner.changeColumn("plugin_store", "type", new TableColumn({
    name: "type", default: "'INVALID'", type: "varchar", length: "32"
  }))
  await Promise.all(formatted.map(([id, options]: [number, string]) => {
    return runner.manager
      .getRepository(PluginStore)
      .createQueryBuilder()
      .update()
      .set({
        //@ts-ignore
        _options: options,
        type: PluginStoreType.GITHUB
      })
      .where({ id })
      .execute()
  }))
  await runner.dropColumn("plugin_store", "url")
  await runner.dropColumn("plugin_store", "headers")
  await runner.dropColumn("plugin_store", "branch")
}

async function toV3(runner: QueryRunner) {
  const configs = await runner.manager
    .getRepository(Plugin)
    .createQueryBuilder()
    .select("id, config")
    .getRawMany()
  await runner.changeColumn("plugin", "config", new TableColumn({
    name: "config", default: "'{}'", type: "text"
  }))
  await Promise.all(configs.map(({ config, id }) => {
    return runner.manager.getRepository(Plugin)
      .createQueryBuilder()
      .update()
      .set({ config })
      .where({ id })
      .execute()
  }))
}

export async function synchronize(connection: Connection) {
  if (config.database.use.toLowerCase() === "sqlite") {
    await connection.query("PRAGMA foreign_keys=OFF")
    await connection.synchronize()
    await connection.query("PRAGMA foreign_keys=ON")
  } else if (config.database.use.toLowerCase() === "mariadb") {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0")
    await connection.synchronize()
    await connection.query("SET FOREIGN_KEY_CHECKS = 1")
  } else if (config.database.use.toLowerCase() === "postgres"){
    await connection.synchronize()
  } else {
    throw new Error(`UNSUPPORTED DATBASE USED: "${config.database.use.toLowerCase()}"`)
  }
  //create default configuration
  const configs = await Config.find()
  await Promise.all(
    Config.DEFAULTS
      .filter(({ name }) => !configs.map(c => c.name).includes(name))
      .map(c => Config.from(c))
  )
}
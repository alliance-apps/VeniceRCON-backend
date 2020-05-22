import yaml from "yaml"
import { promises as fs } from "fs"
import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions"
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions"

export let config: Configuration

export async function initialize() {
  const basepath = `${__dirname}/../../../`
  const file = await fs.readFile(`${basepath}/config.yaml`, "utf-8")
  config = {
    ...yaml.parse(file),
    basepath
  }
}

export interface Configuration {
  basepath: string
  development: boolean
  database: {
    use: "sqlite"|"mariadb"
    sqlite: SqliteConnectionOptions,
    mariadb: MysqlConnectionOptions
  }
  webserver: {
    listenport: number
  }
}
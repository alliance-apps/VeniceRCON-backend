import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions"
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions"
import { Joi } from "koa-joi-router"

export const schema = Joi.object({
  development: Joi.boolean().optional().default(false),
  database: Joi.object({
    use: Joi.string().allow("sqlite", "mariadb").required(),
    sqlite: Joi.any(),
    mariadb: Joi.any()
  }).required(),
  webserver: Joi.object({
    listenport: Joi.number().port().required(),
    jwt: Joi.object({
      maxAge: Joi.number().positive().integer().required(),
      sendRefresh: Joi.number().positive().integer().required()
    }).required(),
    remote_webinterface: Joi.boolean().required(),
    cors: Joi.any()
  }),
  instance: Joi.object({
    syncInterval: Joi.number().integer().positive().min(100).required(),
    plugins: Joi.object({
      baseDir: Joi.string().required(),
      repos: Joi.array().items(Joi.object({
        name: Joi.string().regex(/^[\w\d]+$/).required(),
        repository: Joi.string().required(),
        branch: Joi.string().optional().default("master"),
        headers: Joi.any()
      })).optional()
    })
  })
})

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
    jwt: {
      maxAge: number
      sendRefresh: number
    }
    remote_webinterface: boolean
    cors: Record<string, string|string[]>
  }
  instance: {
    syncInterval: number
    plugins: {
      baseDir: string
      repos?: {
        name: string
        repository: string
        branch: string
        headers?: Record<string, string>
      }[]
    }
  }
}
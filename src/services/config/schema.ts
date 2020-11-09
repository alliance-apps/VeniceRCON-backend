import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions"
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions"
import { Joi } from "koa-joi-router"

export const schema = Joi.object({
  database: Joi.object({
    use: Joi.string().allow("sqlite", "mariadb").required(),
    sqlite: Joi.any(),
    mariadb: Joi.any()
  }).required(),
  logging: Joi.object({
    orm: Joi.boolean().optional().default(false),
    level: Joi.string().allow("verbose", "info", "warn", "error").only().optional().default("info")
  }).required(),
  webserver: Joi.object({
    listenport: Joi.number().port().required(),
    proxy: Joi.boolean().optional().default(false),
    prettyJson: Joi.boolean().optional().default(false),
    jwt: Joi.object({
      maxAge: Joi.number().positive().integer().required(),
      sendRefresh: Joi.number().positive().integer().required()
    }).required(),
    cors: Joi.array().items(Joi.string()).optional().default([])
  }).required(),
  instance: Joi.object({
    syncInterval: Joi.number().integer().positive().min(100).optional().default(5000),
    plugins: Joi.object({
      baseDir: Joi.string().required(),
      reloadInterval: Joi.number().integer().positive().optional().default(60),
      repos: Joi.array().items(Joi.object({
        name: Joi.string().regex(/^[\w\d]+$/).required(),
        repository: Joi.string().required(),
        branch: Joi.string().optional().default("master"),
        headers: Joi.any()
      })).optional().default([])
    })
  })
})

export interface Configuration {
  basepath: string
  database: {
    use: "sqlite"|"mariadb"
    sqlite: SqliteConnectionOptions,
    mariadb: MysqlConnectionOptions
  }
  logging: {
    orm: boolean
    level: "verbose"|"info"|"warn"|"error"
  }
  webserver: {
    listenport: number
    prettyJson: boolean
    proxy: boolean
    jwt: {
      maxAge: number
      sendRefresh: number
    }
    cors: string[]
  }
  instance: {
    syncInterval: number
    plugins: {
      baseDir: string
      reloadInterval: number
      repos: {
        name: string
        repository: string
        branch: string
        headers?: Record<string, string>
      }[]
    }
  }
}
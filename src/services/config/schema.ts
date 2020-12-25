import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions"
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions"
import { Joi } from "koa-joi-router"
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions"
import SMTPTransport from "nodemailer/lib/smtp-transport"

export const schema = Joi.object({
  database: Joi.object({
    use: Joi.string().allow("sqlite", "mariadb", "postgres").required(),
    sqlite: Joi.any(),
    mariadb: Joi.any(),
    postgres: Joi.any()
  }).required(),
  logging: Joi.object({
    orm: Joi.boolean().optional().default(false),
    level: Joi.string().allow("verbose", "info", "warn", "error").only().optional().default("info")
  }).required(),
  webserver: Joi.object({
    bindAddress: Joi.string().ip().optional().default("0.0.0.0"),
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
  }),
  smtp: Joi.object({
    enable: Joi.boolean().optional().default(false),
    senderAddress: Joi.string().optional().default("foo@example.com"),
    options: Joi.any(),
    content: Joi.object({
      subject: Joi.string().optional().default("Forgot Password request"),
      text: Joi.string().optional().default("Hello %username%,\na password reset has been requested for your account!\nYour new password is:\n\n%password%")
    })
  }),
  metrics: Joi.object({
    prometheus: Joi.object({
      enable: Joi.boolean().optional().default(false),
      instance: Joi.string().default("default"),
      basicauth: Joi.object({
        name: Joi.string(),
        pass: Joi.string()
      }),
    }).default({ enable: false, instance: "default" })
  }).default({ prometheus: { enable: false, instance: "default" }})
})

export interface Configuration {
  basepath: string
  database: {
    use: "sqlite"|"mariadb"|"postgres"
    sqlite: SqliteConnectionOptions,
    mariadb: MysqlConnectionOptions,
    postgres: PostgresConnectionOptions
  }
  logging: {
    orm: boolean
    level: "verbose"|"info"|"warn"|"error"
  }
  webserver: {
    bindAddress: string
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
  },
  smtp: {
    enable: boolean,
    senderAddress: string
    options: SMTPTransport
    content: {
      subject: string
      text: string
    }
  },
  metrics?: {
    prometheus: {
      enable: boolean
      instance: string
      basicauth: {
        name: string,
        pass: string
      }
    }
  }
}
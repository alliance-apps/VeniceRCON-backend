import { Logger } from "typeorm"
import chalk from "chalk"
import winston from "winston"

export class WinstonLogger implements Logger {

  private format(
    level: "warn"|"error"|"verbose"|"info",
    props: { type: string, messages: string[] }
  ) {
    winston.log({
      level,
      message: `${chalk.magenta.dim(props.type)} ${props.messages.join(" ")}`
    })
  }

  logQuery(query: string, parameters: string[] = []) {
    const messages = [chalk.bold(query), ...parameters]
    this.format("verbose", { type: "TYPEORM_QUERY_LOG", messages })
  }

  logQueryError(error: string, query: string, parameters: string[] = []) {
    const messages = [chalk.red(error), query, ...parameters.map(p => chalk.bold(p))]
    this.format("error", { type: "TYPEORM_QUERY_ERROR", messages })
  }

  logQuerySlow(time: number, query: string, parameters: string[] = []) {
    const messages = [chalk.yellow(time), query, ...parameters.map(p => chalk.bold(p))]
    this.format("warn", { type: "TYPEORM_QUERY_SLOW", messages })
  }

  logSchemaBuild(message: string) {
    const messages = [message]
    this.format("info", { type: "TYPEORM_LOG_SCHEMA_BUILD", messages })
  }

  logMigration(message: string) {
    const messages = [message]
    this.format("info", { type: "TYPEORM_LOG_MIGRATION", messages })
  }

  log(level: "log"|"info"|"warn", message: any) {
    const messages = [message]
    this.format(level as any, { type: "TYPEORM_LOG", messages })
  }

}
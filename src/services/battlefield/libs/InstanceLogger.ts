import winston, { format, transports } from "winston"
import { Instance } from "./Instance"
import { errorLog, prettyLog } from "../../../util/winston"
import { LogMessage } from "@entity/LogMessage"
import { socketManager } from "@service/koa/socket"
import { InstanceScope } from "@service/permissions/Scopes"

export class InstanceLogger {

  readonly parent: Instance
  private logger: winston.Logger

  constructor(props: InstanceLogger.Props) {
    this.parent = props.instance
    this.logger = winston.createLogger({
      format: format.combine(
        errorLog()
      ),
      transports: [
        new transports.Console({
          level: "info",
          format: format.combine(
            format.timestamp({format: "DD.MM.YYYY HH:mm:ss.SSS"}),
            prettyLog(),
            format.printf(opts => opts.message)
          )
        })
      ]
    })
  }

  private async createDBEntry(message: string, level: string, source: LogMessage.Source, sourceLocation?: string) {
    const entity = await LogMessage.from({ message, level, instanceId: this.parent.id, source, sourceLocation })
    socketManager
      .subscribedTo(this.parent.id)
      .hasPermission(this.parent.id, InstanceScope.LOGS)
      .emitInstanceLogMessages([entity])
  }

  async info(
    message: string,
    source: LogMessage.Source = LogMessage.Source.INSTANCE,
    sourceLocation?: string
  ) {
    this.logger.info(message)
    await this.createDBEntry(message, "info", source, sourceLocation)
  }

  async warn(
    message: string,
    source: LogMessage.Source = LogMessage.Source.INSTANCE,
    sourceLocation?: string
  ) {
    this.logger.warn(message)
    await this.createDBEntry(message, "warn", source, sourceLocation)
  }

  async error(
    message: string|Error,
    source: LogMessage.Source = LogMessage.Source.INSTANCE,
    sourceLocation?: string
  ) {
    this.logger.error(message)
    await this.createDBEntry(
      message instanceof Error ? message.stack! : message,
      "error",
      source,
      sourceLocation
    )
  }

}

export namespace InstanceLogger {

  export interface Props {
    instance: Instance
  }

}
import { Messenger } from "@service/plugin/shared/messenger/Messenger"

export class PluginLogger {

  private _messenger: Messenger
  private _pluginName: string

  constructor(messenger: Messenger, pluginName: string) {
    this._messenger = messenger
    this._pluginName = pluginName
  }

  async log(level: "info"|"warn"|"error", data: any) {
    const message = typeof data === "string" ? data : JSON.stringify(data, null, 2)
    const pluginName = this._pluginName
    try {
      await this._messenger.send("LOG_MESSAGE", { message, level, pluginName })
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log(`could not log message "${message}" with loglevel ${level}`, e)
    }
  }

  info(data: any) {
    return this.log("info", data)
  }

  warn(data: any) {
    return this.log("warn", data)
  }

  error(data: any) {
    return this.log("error", data)
  }
}
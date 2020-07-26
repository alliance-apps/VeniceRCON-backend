import winston from "winston"
import chalk from "chalk"
import { Console } from "console"
import { Plugin } from "./Plugin"
import { createContext } from "vm"

export class ContextHelper {

  parent: Plugin

  constructor(props: ContextHelper.Props) {
    this.parent = props.parent
  }

  private format(level: "warn"|"error"|"verbose"|"info", data: any[]) {
    const serialized = data.map(d => JSON.stringify(d, null, 2)).join(", ")
    winston.log({
      level,
      message: `${chalk.blueBright.bold(this.parent.info.name)} ${serialized}`
    })
  }

  private createConsole() {
    const console = new Console({
      stdout: process.stdout,
      stderr: process.stderr
    })
    return {
      ...console,
      info: (...args: any[]) => this.format("info", args),
      log: (...args: any[]) => this.format("info", args),
      error: (...args: any[]) => this.format("error", args),
      debug: (...args: any[]) => this.format("verbose", args),
      warn: (...args: any[]) => this.format("warn", args)
    }
  }

  async create() {
    return createContext({
      console: this.createConsole(),
      battlefield: this.parent.parent.battlefield,
      config: await this.parent.getConfig()
    })
  }

}

export namespace ContextHelper {
  export interface Props {
    parent: Plugin
  }
}
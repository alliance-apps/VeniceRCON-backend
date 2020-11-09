import { promises as fs } from "fs"
import path from "path"
import yaml from "yaml"
import winston from "winston"
import { schema, Configuration } from "./schema"
import { updateLogLevel } from "util/winston"

export let config: Configuration

export async function initialize() {
  const basepath = path.join(__dirname, "/../../../")
  const data = yaml.parse(await fs.readFile(`${basepath}/config.yaml`, "utf-8"))
  try {
    config = {
      ...await schema.validateAsync(data, { allowUnknown: true }),
      basepath
    }
    updateLogLevel(config.logging.level)
  } catch (e) {
    winston.error("could not validate configuration! please check your config.yaml against config.dist.yaml!")
    throw e
  }

}

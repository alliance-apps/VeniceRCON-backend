import { promises as fs } from "fs"
import yaml from "yaml"
import { metaSchema } from "../schema"

/**
 * loads and parses a plugin schema
 * @param path path to the meta file
 */
export async function loadPluginMeta(path: string) {
  const data = yaml.parse(await fs.readFile(path, "utf-8"))
  return metaSchema.validateAsync(data)
}
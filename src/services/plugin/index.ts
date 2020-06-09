import { PluginManager } from "./libs/PluginManager"
import path from "path"

export let manager: PluginManager

export async function initialize() {
  manager = new PluginManager({
    path: path.join(__dirname, "/../../../plugins")
  })

  await manager.init()
}
import { PluginManager } from "./libs/PluginManager"
import path from "path"

export let pluginManager: PluginManager

export async function initialize() {
  pluginManager = new PluginManager({
    path: path.join(__dirname, "/../../../plugins")
  })

  await pluginManager.init()
}
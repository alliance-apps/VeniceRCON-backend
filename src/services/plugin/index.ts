import { PluginManager } from "./main/PluginManager"
import path from "path"
import { config } from "@service/config"

export let pluginManager: PluginManager

export async function initialize() {
  pluginManager = new PluginManager({
    path: path.join(__dirname, "/../../../", config.instance.plugins.baseDir)
  })

  await pluginManager.init()
}
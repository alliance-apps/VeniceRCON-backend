import { PluginStore } from "./store/PluginStore"
import { config } from "@service/config"

export let pluginStore: PluginStore

export async function initialize() {
  pluginStore = new PluginStore({
    repos: config.instance.plugins.repos || []
  })
}
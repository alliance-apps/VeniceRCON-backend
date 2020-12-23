import { PluginStore } from "./store/PluginStore"

export let pluginStore: PluginStore

export async function initialize() {
  pluginStore = new PluginStore()
  await pluginStore.init()
  await pluginStore.reload()
}
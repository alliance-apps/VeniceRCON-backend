import { Provider } from "./Provider"
import { config } from "@service/config"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"

export class PluginStore {

  providers: Provider[] = []

  constructor(props: PluginStore.Props) {
    this.providers = props.repos.map(repo => new Provider(repo))
  }

  getBaseDir(instance: Instance) {
    return path.join(
      config.basepath,
      config.instance.plugins.baseDir,
      instance.id.toString(10)
    )
  }

  reload() {
    return Promise.all(this.providers.map(p => p.reload()))
  }

  getPlugins() {
    return this.providers
      .map(({ plugins, name }) => plugins.map(p => ({ store: name, ...p.json() })))
      .flat()
  }

  getStore(name: string) {
    return this.providers.find(p => p.name === name)
  }
}

export namespace PluginStore {
  export interface Props {
    repos: Provider.Props[]
  }
}
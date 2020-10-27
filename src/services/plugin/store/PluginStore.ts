import { Provider } from "./Provider"
import { config } from "@service/config"
import path from "path"
import { Instance } from "@service/battlefield/libs/Instance"

export class PluginStore {

  providers: Provider[] = []

  constructor(props: PluginStore.Props) {
    this.providers = props.repos.map(repo => new Provider(repo))
  }

  /**
   * retrieves the plugin installation path for the specified instance
   * @param instance instance to retrieve the installation path from
   */
  getBaseDir(instance: Instance) {
    return path.join(
      config.basepath,
      config.instance.plugins.baseDir,
      instance.id.toString(10)
    )
  }

  /** reloads the content of all repositories */
  reload() {
    return Promise.all(this.providers.map(p => p.reload()))
  }

  /** retrieves a map of all plugins available */
  getPlugins() {
    return this.providers
      .map(({ plugins }) => plugins.map(p => p.json()))
      .flat()
  }

  /** retrieves a specific store by its nmae */
  getStore(name: string) {
    return this.providers.find(p => p.name === name)
  }
}

export namespace PluginStore {
  export interface Props {
    repos: Provider.Props[]
  }
}
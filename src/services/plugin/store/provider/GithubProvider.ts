import { Provider } from "./Provider"
import fetch from "node-fetch"
import yaml from "yaml"
import { PluginStoreSchema } from "../schema"
import { Repository } from "../Repository"
import unzipper from "unzipper"

export class GithubProvider extends Provider {

  /** retrieves a list of plugins */
  protected async fetchPlugins(): Promise<PluginStoreSchema> {
    const response = await fetch(this.url, {
      headers: JSON.parse(this.entity.headers),
      redirect: "follow"
    })
    return yaml.parse(await response.text())
  }

  async downloadPlugin(repository: Repository, location: string) {
    const res = await  fetch(`${repository.repository}/archive/${repository.commit}.zip`)
    const data = await unzipper.Open.buffer(await res.buffer())
    //manipulate directory path
    data.files.forEach(f => f.path = f.path.split("/").slice(1).join("/"))
    await data.extract({ path: location })
  }

}

export namespace GithubProvider {

}
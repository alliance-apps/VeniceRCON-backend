import { Messenger } from "@service/plugin/shared/messenger/Messenger"

export class PluginEngine {

  private readonly messenger: Messenger

  constructor(props: PluginEngine.Props) {
    this.messenger = props.messenger
  }

  requestPlayerPermissions(guid: string) {
    return new Promise(async fulfill => {
      try {
        const perms = await this.messenger.send("REQUEST_PERMISSIONS", { guid })
        fulfill(perms)
      } catch (e) {
        fulfill([])
      }
    })
  }
}

export namespace PluginEngine {
  export interface Props {
    messenger: Messenger
  }
}
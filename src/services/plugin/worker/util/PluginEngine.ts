import { Messenger } from "@service/plugin/shared/messenger/Messenger"
import { EventEmitter } from "events"

export type VarsChangedEventProps = {
  changes: Record<string, string>
}

export interface PluginEngine {
  on(event: "varsChanged", callback: (data: VarsChangedEventProps) => void): this
}

export class PluginEngine extends EventEmitter {

  private readonly messenger: Messenger

  constructor(props: PluginEngine.Props) {
    super()
    this.messenger = props.messenger
  }

  requestPlayerPermissions(guid: string) {
    return new Promise<any>(async fulfill => {
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
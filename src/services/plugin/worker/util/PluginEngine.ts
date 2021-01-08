import { Messenger } from "@service/plugin/shared/messenger/Messenger"
import { EventEmitter } from "events"
import { Battlefield } from "vu-rcon"

export type VarsChangedEventProps = {
  changes: Record<string, string>
}

export interface PluginEngine {
  on(event: "newListener", callback: (event: string) => void): this
  on(event: "varsChanged", callback: (data: VarsChangedEventProps) => void): this
  on(event: "playerlist", callback: (data: Battlefield.PlayerList) => void): this
  on(event: "serverinfo", callback: (data: Battlefield.ServerInfo) => void): this
}

export class PluginEngine extends EventEmitter {

  static SERVERINFO_POLL_INTERVAL = 5 * 1000

  private readonly battlefield: Battlefield
  private readonly messenger: Messenger
  private registeredEvents: string[] = []
  private pollingTimeout: Record<string, NodeJS.Timeout> = {}

  constructor(props: PluginEngine.Props) {
    super()
    this.battlefield = props.battlefield
    this.messenger = props.messenger
    this.initialize()
  }

  private initialize() {
    this.on("newListener", (event: string) => {
      if (this.registeredEvents.includes(event)) return
      switch (event) {
        case "serverinfo":
          this.registeredEvents.push("serverinfo")
          return this.watchCommandAndPoll({
            command: "serverinfo",
            interval: 5000,
            execute: () => this.battlefield.serverInfo(),
            event: "serverinfo"
          })
        case "playerlist":
          this.registeredEvents.push("serverinfo")
          return this.watchCommandAndPoll({
            command: "admin.listPlayers",
            interval: 5000,
            execute: () => this.battlefield.getPlayers(),
            event: "playerlist"
          })
      }
    })
  }

  private watchCommandAndPoll(props: PluginEngine.WatchAndPollProps) {
    clearTimeout(this.pollingTimeout[props.event])
    this.pollingTimeout[props.event] = setInterval(() => props.execute(), props.interval)
    this.battlefield.on("requestSend", ({ request }) => {
      if (request.packet.words[0].toString() !== props.command) return
      this.pollingTimeout.serverinfo.refresh()
    })
    this.battlefield.on("requestReceive", ({ request }) => {
      if (request.packet.words[0].toString() !== props.command) return
      this.emit(props.event, request.getResponseContent())
    })
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
    battlefield: Battlefield
  }

  export interface WatchAndPollProps {
    command: string
    event: string
    execute: () => void
    interval: number
  }

}
import { Instance } from "./Instance"
import { socketManager } from "@service/koa/socket"
import { EventScope } from "@service/permissions/Scopes"
import { Kill } from "@entity/Kill"
import { PlayerOnKill } from "vu-rcon/lib/types/Event"

export class KillFeedManager {

  private parent: Instance
  private feed: Kill[] = []

  constructor(props: KillFeedManager.Props) {
    this.parent = props.instance
    this.initialize()
  }

  private get resolver() {
    return this.parent.nameResolver
  }

  private get id() {
    return this.parent.id
  }

  private get battlefield() {
    return this.parent.battlefield
  }

  /**
   * retrieves x kills from a certain date
   * @param count amount of messages to retrieve
   * @param from get messages from a specific date
   */
  async getFeed(
    count: number = KillFeedManager.MESSAGECOUNT,
    from: number|Date = Date.now()
  ) {
    const date = from instanceof Date ? from : new Date(from)
    const feed = this.feed.filter(msg => msg.created < date)
    if (feed.length > count) return feed.slice(0, count)
    if (feed.length === count) return feed
    return Kill.getFeed(this.id, count, date)
  }

  private async addKill(kill: Kill) {
    this.feed = [...this.feed, kill].slice(KillFeedManager.MESSAGECOUNT * -1)
    socketManager.hasPermission(this.id, EventScope.KILL).emitKill([kill])
  }

  private async initialize() {
    this.feed = await this.getFeed()
    this.battlefield.on("kill", this.onKill.bind(this))
  }

  private async onKill(ev: PlayerOnKill) {
    const { killer, killed } = await this.resolver.getPlayerIds({ killer: ev.killer, killed: ev.killed })
    if (!killed) return this.parent.log.error(`could not find killed player with name ${ev.killed}`)
    this.addKill(await Kill.from({ ...ev, killed, killer, instance: this.id }))
  }
}

export namespace KillFeedManager {

  export const MESSAGECOUNT = 50

  export interface Props {
    instance: Instance
  }
}
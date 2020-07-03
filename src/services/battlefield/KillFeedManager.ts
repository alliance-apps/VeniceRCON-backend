import { Instance } from "./Instance"
import { MoreThan } from "typeorm"
import { socketManager } from "@service/koa/socket"
import { EventScope } from "@service/permissions/Scopes"
import { Kill } from "@entity/Kill"

export class KillFeedManager {

  private parent: Instance
  private feed: Kill[] = []

  constructor(props: KillFeedManager.Props) {
    this.parent = props.instance
    this.initialize()
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
    this.battlefield.on("kill", async ev => {
      const killer = ev.killer ? await this.parent.getPlayerByName(ev.killer) : undefined
      if (ev.killer && !killer) throw new Error(`could not find killer with name "${ev.killer}"`)
      const killed = await this.parent.getPlayerByName(ev.killed)
      if (!killed) throw new Error(`Could not find killed player with name "${ev.killed}"`)
      this.addKill(await Kill.from({ ...ev, killed, killer, instance: this.id }))
    })
  }
}

export namespace KillFeedManager {

  export const MESSAGECOUNT = 50

  export interface Props {
    instance: Instance
  }
}
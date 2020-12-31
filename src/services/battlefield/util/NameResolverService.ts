import { Player } from "../../orm/entity/Player"

export class NameResolverService {

  /** remove entries which have not been called after 1 hour */
  static REMOVE_UNUSED_ENTRY_AFTER = 60 * 60 * 1000

  private names: Record<string, Promise<NameResolverService.Result>> = {}
  private timeouts: Record<string, any> = {}
  private removeAfter: number
  private resolver: NameResolverService.Resolver

  constructor(props: NameResolverService.Props) {
    this.removeAfter = props.removeAfter || NameResolverService.REMOVE_UNUSED_ENTRY_AFTER
    this.resolver = props.resolveName
  }

  /** resolves a name to id, guid and name itself */
  get(name: string) {
    if (this.names[name] instanceof Promise) {
      this.createTimeout(name)
      return this.names[name]
    }
    return this.findName(name)
  }

  /** retrieves a named object of player ids */
  async getPlayerIds(names: Record<string, string|undefined>) {
    return Object.fromEntries(await Promise.all(Object.keys(names).map(async k => {
      const name = names[k]
      if (typeof name !== "string") return [k, undefined]
      return [k, (await this.get(name)).id]
    })))
  }

  /** sets a new timeout fo the specified name */
  private createTimeout(name: string) {
    clearTimeout(this.timeouts[name])
    const timeout = setTimeout(() => this.removeName(name), this.removeAfter)
    this.timeouts[name] = timeout
  }

  private removeName(name: string) {
    clearTimeout(this.timeouts[name])
    delete this.timeouts[name]
  }

  /** finds a database entry */
  private findName(name: string): Promise<NameResolverService.Result> {
    const resolveable: Promise<NameResolverService.Result> = new Promise(async fulfill => {
      const player = await Player.findByName(name)
      if (player) return fulfill(player)
      const guid = await this.resolver(name)
      const entity = await Player.createPlayerSave({ guid, name })
      fulfill({ id: entity.id, guid: entity.guid, name: entity.name })
    })
    resolveable
      .then(() => this.createTimeout(name))
      .catch(() => this.removeName(name))
    return resolveable
  }


}

export namespace NameResolverService {

  export type Props = {
    /** should return the guid to the name */
    resolveName: Resolver
    removeAfter?: number
  }

  export type Resolver = (name: string) => Promise<string>

  export type Result = {
    id: number
    guid: string
    name: string
  }
}
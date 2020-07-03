import { Messenger } from "../messenger/Messenger"

export abstract class SharedClass<T extends {}> {

  static EXECUTE = "__execute"
  protected _type: new (...args:any[]) => T
  protected _listener: ((...args: any[]) => any)|undefined
  protected _parent: T|undefined
  protected _messenger: Messenger
  protected _namespace: string

  constructor(props: SharedClass.Props<T>) {
    this._type = props.type
    this._parent = props.parent
    this._messenger = props.messenger
    this._namespace = props.namespace
    const names = Object
      .getOwnPropertyNames(this._type.prototype)
      .filter(name => !["constructor"].includes(name) && !name.startsWith("_"))
    names.forEach(name => {
      //@ts-ignore
      this[name] = (...args: any[]) => this._execute(name, args)
    })
    if (this._parent) {
      this._listener = this._onCommand.bind(this)
      this._messenger.on(this._EXECEVENT, this._listener)
    }
  }

  /** namespace for data transmission */
  get _EXECEVENT() {
    return `${this._namespace}${SharedClass.EXECUTE}`
  }

  /** cleanup when entity should get collected from gc */
  $remove() {
    if (this._listener) this._messenger.removeListener(this._EXECEVENT, this._listener)
  }

  /** receive command */
  private async _onCommand(event: Messenger.Event<{ name: string, args: any[] }>) {
    if (!this._parent) throw new Error("parent is not a valid class!")
    try {
      const { name, args } = event.message.data
      //@ts-ignore
      event.message.done(await this._parent[name](...args))
    } catch (e) {
      throw e
    }
  }

  /** execute a command, either with a locally existing class or remote */
  protected _execute(name: keyof T, args: any[]) {
    //@ts-ignore
    if (this._parent) return this._parent[name](...args)
    return this._messenger.send(`${this._namespace}${SharedClass.EXECUTE}`, { name, args })
  }

}

export namespace SharedClass {
  export interface Props<T extends {}> {
    type: new (...args:any[]) => T
    parent: T|undefined
    messenger: Messenger
    namespace: string
  }
}
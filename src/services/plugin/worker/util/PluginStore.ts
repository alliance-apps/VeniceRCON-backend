import { promises as fs } from "fs"

export class PluginStore<T extends {} = any> {

  static SAVE_TIMEOUT = 1000
  static SAVE_TIMEOUT_MAX = 10 * 1000
  private file: string
  private timeout: any
  private timeoutMax: any
  private timeoutActive: boolean = false
  private data: PluginStore.DeepPartial<T>

  constructor(props: PluginStore.Props) {
    this.file = props.file
    this.data = props.data || {}
  }

  /** delay timeout for save interval */
  private delayTimeout() {
    if (!this.timeoutActive) {
      this.timeoutActive = true
      this.timeoutMax = setTimeout(() => this.save(), PluginStore.SAVE_TIMEOUT_MAX)
    }
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => this.save(), PluginStore.SAVE_TIMEOUT)
  }

  /** saves to file */
  private async save() {
    this.timeoutActive = false
    clearTimeout(this.timeout)
    clearTimeout(this.timeoutMax)
    await fs.writeFile(this.file, JSON.stringify(this.data), "utf8")
  }

  /** retrieves a certain value from store */
  get<P extends keyof T>(key: P): PluginStore.DeepPartial<T[P]>|undefined {
    return this.data[key]
  }

  /** sets a value from store */
  set<P extends keyof T>(key: P, value: T[P]) {
    this.data[key] = value
    this.delayTimeout()
  }

  /** clears the store */
  clear() {
    this.data = {}
    this.save()
  }

  static async from<T>(props: PluginStore.Props) {
    let data = {}
    try {
      await fs.stat(props.file)
      data = JSON.parse(await fs.readFile(props.file, "utf8"))
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
    return new PluginStore<T>({ ...props, data })
  }
}

export namespace PluginStore {
  export interface Props {
    file: string
    data?: any
  }

  export type DeepPartial<T extends {}> = {
    [P in keyof T]?: DeepPartial<T[P]>
  }
}
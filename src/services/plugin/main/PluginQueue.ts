import { Plugin } from "./Plugin"

/**
 * handles startup of multiple plugins
 */
export class PluginQueue {

  readonly started: string[]
  readonly plugins: Plugin[]
  private state: PluginQueue.State = PluginQueue.State.NO_DEPENDENCY

  constructor(plugins: Plugin[], started: string[] = []) {
    this.plugins = plugins
    this.started = started
  }

  /**
   * removes a specific plugin and adds its name to the started list
   * @param plugin plugin which has been started
   */
  private removePlugin(plugin: Plugin) {
    this.started.push(plugin.name)
    this.plugins.splice(this.plugins.indexOf(plugin), 1)
    return plugin
  }

  /**
   * gets the next plugin which should get started
   */
  next(): Plugin|false {
    if (this.state === PluginQueue.State.NO_DEPENDENCY) {
      const plugin = this.plugins
        .find(p => !p.meta.dependecies || p.meta.dependecies.length === 0)
      if (plugin) {
        return this.removePlugin(plugin)
      } else {
        this.state = PluginQueue.State.WITH_DEPENDENCY
      }
    }
    if (this.state === PluginQueue.State.WITH_DEPENDENCY) {
      const plugin = this.plugins
        .find(p => p.meta.dependecies!.every(name => this.started.includes(name)))
      if (plugin) {
        return this.removePlugin(plugin)
      }
    }
    return false
  }
}

export namespace PluginQueue {
  export enum State {
    NO_DEPENDENCY,
    WITH_DEPENDENCY
  }
}
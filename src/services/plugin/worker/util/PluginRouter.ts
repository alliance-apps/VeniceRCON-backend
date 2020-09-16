import type { PluginWorker } from "@service/plugin/main/PluginWorker"

export class PluginRouter {

  private methods: PluginRouter.MethodProps = {
    get: {}, post: {}, patch: {}, delete: {}
  }

  executeRoute(props: PluginWorker.ExecuteRouteProps) {
    return new Promise(async (fulfill, reject) => {
      const method = props.method.toLowerCase()
      if (!(method in this.methods)) throw new Error(`method with name "${method}" not found`)
      const cb = this.methods[method as keyof PluginRouter.MethodProps][props.path]
      if (typeof cb !== "function") throw new Error("no handler has been registered for this route")
      try {
        await cb({ body: props.body, send: fulfill })
      } catch (e) {
        reject(e)
      }
    })
  }

  get(name: string, callback: PluginRouter.RouterCallback) {
    this.methods.get[name] = callback
    return this
  }

  post(name: string, callback: PluginRouter.RouterCallback) {
    this.methods.post[name] = callback
    return this
  }

  patch(name: string, callback: PluginRouter.RouterCallback) {
    this.methods.patch[name] = callback
    return this
  }

  delete(name: string, callback: PluginRouter.RouterCallback) {
    this.methods.delete[name] = callback
    return this
  }
}

export namespace PluginRouter {

  export interface MethodProps {
    get: Record<string, RouterCallback>
    post: Record<string, RouterCallback>
    patch: Record<string, RouterCallback>
    delete: Record<string, RouterCallback>
  }

  export type RouterCallback = (ctx: Context) => void

  export interface Context {
    body: any
    send: (data: any) => void
  }
}
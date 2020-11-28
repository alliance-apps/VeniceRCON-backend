import type { PluginWorker } from "@service/plugin/main/PluginWorker"
import { PluginRouterResponse } from "./PluginRouterResponse"

export class PluginRouter {

  private methods: PluginRouter.MethodProps = {
    get: {}, post: {}, patch: {}, delete: {}
  }

  _executeRoute(props: PluginWorker.ExecuteRouteProps) {
    return new Promise<PluginRouterResponse.ReplyData>(async (fulfill, reject) => {
      const response = new PluginRouterResponse(fulfill)
      const method = props.method.toLowerCase()
      if (!(method in this.methods)) return response.send(404)
      const cb = this.methods[method as keyof PluginRouter.MethodProps][props.path]
      if (typeof cb !== "function") return response.send(404)
      try {
        await cb({ body: props.body, res: response })
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
    res: PluginRouterResponse
  }
}
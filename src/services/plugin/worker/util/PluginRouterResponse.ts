export class PluginRouterResponse {


  responseCode: number|undefined
  responseBody: any
  private reply: PluginRouterResponse.ReplyCallback

  constructor(reply: PluginRouterResponse.ReplyCallback) {
    this.reply = reply
  }

  /**
   * body to reply with
   * this data will be replied as json
   * @param data data to reply back to the client
   */
  body(data: any) {
    if (!this.responseCode) this.responseCode = 200
    this.responseBody = data
    return this
  }

  /**
   * status code to reply with
   * @param code http status code to respond with
   */
  status(code: number) {
    this.responseCode = code
    return this
  }

  /**
   * sends the reply back to the client
   * @param code optional status code to set
   */
  send(code?: number) {
    return this.reply({
      status: code || this.responseCode || 200,
      body: this.responseBody
    })
  }
}

export namespace PluginRouterResponse {
  export type ReplyCallback = (data: ReplyData) => void
  export type ReplyData = { body: string, status: number }
}
import fetch from "node-fetch"

function commonHeaders(common: HTTP_COMMON_PROPS) {
  return (props: Record<string, string> = {}) => {
    const headers: Record<string, string> = {}
    const token = common.token()
    if (token) headers.Authorization = `Bearer ${token}`
    return {...headers, ...props }
  }
}

export const Api = (props: HTTP_COMMON_PROPS) => ({
  /** make a GET request to the api url */
  get(path: string) {
    return fetch(`${props.host}/api${path}`, {
      method: "GET",
      headers: commonHeaders(props)()
    })
  },
  /** make a POST request to the api url */
  post(path: string, body: any) {
    return fetch(`${props.host}/api${path}`, {
      method: "POST",
      headers: commonHeaders(props)({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(body)
    })
  },
  delete(path: string) {
    return fetch(`${props.host}/api${path}`, {
      method: "DELETE",
      headers: commonHeaders(props)()
    })
  },
  /** make a POST request to the api url */
  patch(path: string, body: any) {
    return fetch(`${props.host}/api${path}`, {
      method: "PATCH",
      headers: commonHeaders(props)({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(body)
    })
  }
})


export type HTTP_COMMON_PROPS = {
  host: string,
  token: () => string
}

export class Cache {
  protected cache: Record<string, any> = {}

  set(key: string, data: any) {
    this.cache[key] = data
    return this
  }

  unset(key: string) {
    delete this.cache[key]
    return this
  }

  clear() {
    this.cache = {}
    return this
  }

  get(key: string) {
    return this.cache[key]
  }
}

export class TokenManager extends Cache {

  private loadNext: string|null = "DEFAULT"

  get(key?: string) {
    let next: string|null = "DEFAULT"
    if (key) {
      next = key
    } else {
      next = this.loadNext
      this.loadNext = "DEFAULT"
    }
    if (next === null) return undefined
    return this.cache[next]
  }

  next(key: string|null) {
    this.loadNext = key
    return this
  }
}
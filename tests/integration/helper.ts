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
  }
})


export type HTTP_COMMON_PROPS = {
  host: string,
  token: () => string
}
import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import kill from "tree-kill"
import { Api, TokenManager, Cache } from "./helper"


const HOST = `http://127.0.0.1:45321`
const USERNAME = "admin"
const PASSWORD = "foobar"
const EMAIL = "foo@example.com"


describe("API", () => {

  let child: ChildProcessWithoutNullStreams
  const tokenManager = new TokenManager()
  const cache = new Cache()
  const history: string[] = []

  const api = Api({
    host: HOST,
    token: () => tokenManager.get()
  })

  beforeEach(() => {
    tokenManager.use("DEFAULT")
  })

  beforeAll(async () => {
    try {
      await fs.unlink(`${__dirname}/../../__TEST__.db`)
    } catch (e) {
      if (e.code !== "ENOENT") throw e
    }
    const args = [
      "--config=./tests/config.test.yaml",
      "--override-password=foobar"
    ]
    const index = path.join(__dirname, "/../../lib/index.js")
    child = spawn("sh", ["-c", `node ${index} ${args.join(" ")}`])
    await (() => new Promise<void>(fulfill => {
      child.stdout.on("data", (buffer: Buffer) => {
        const msg = buffer.toString("utf8")
        history.push(msg)
        if (!msg.includes("created default user")) return
        fulfill()
      })
    }))()
  })


  afterAll(() => {
    return new Promise<void>(fulfill => {
      child.on("close", () => fulfill())
      // tslint:disable-next-line: no-console
      console.log(history.slice(history.length - 8).join(""))
      kill(child.pid)
      process.stdout.removeAllListeners()
      process.stdin.removeAllListeners()
    })
  }, 5000)

  it("POST /auth/login - it should fail on wrong password", async () => {
    expect.assertions(1)
    const res = await api.post("/auth/login", {
      username: USERNAME, password: "INVALID"
    })
    expect(res.status).toBe(401)
  })

  it("POST /auth/login - should successfully login", async () => {
    expect.assertions(2)
    const res = await api.post("/auth/login", {
      username: USERNAME, password: PASSWORD
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.token).toBe("string")
    tokenManager.set("DEFAULT", data.token)
  })

  it("GET /auth/whoami - should get valid account data", async () => {
    expect.assertions(6)
    const res = await api.get("/auth/whoami")
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Object.keys(data)).toEqual(["email", "permissions", "token"])
    expect(data.email).toBe(null)
    expect(data.token.v).toBe(1)
    expect(data.token.id).toBe(1)
    expect(data.token.username).toBe("admin")
  })


  it("POST /auth/update-self - should disallow with wrong password", async () => {
    expect.assertions(1)
    const res = await api.post("/auth/update-self", {
      currentPassword: "INVALID",
      email: EMAIL
    })
    expect(res.status).toBe(401)
  })


  it("POST /auth/update-self - should update the own password", async () => {
    expect.assertions(3)
    let res = await api.post("/auth/update-self", { currentPassword: PASSWORD, email: EMAIL })
    expect(res.status).toBe(200)
    res = await api.get("/auth/whoami")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe(EMAIL)
  })

  it("GET /users - should retrieve all users created", async () => {
    expect.assertions(5)
    const res = await api.get("/users")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    expect(body[0].username).toBe(USERNAME)
    expect(body[0].email).toBe(EMAIL)
  })

  it("POST /users - should create a new user", async () => {
    expect.assertions(7)
    const details = { username: "foobar", password: "foobar" }
    let res = await api.post("/users", details)
    expect(res.status).toBe(200)
    let body = await res.json()
    expect(Array.isArray(body)).toBe(false)
    expect(body.username).toBe("foobar")
    expect(body.email).toBe(null)
    expect(body.permissions.length).toBe(0)
    cache.set("foobar", body)
    tokenManager.use()
    res = await api.post("/auth/login", details)
    expect(res.status).toBe(200)
    body = await res.json()
    expect(typeof body.token).toBe("string")
    tokenManager.set("foobar", body.token)
  })

  it("GET /users/:id - should retrieve the correct user", async () => {
    expect.assertions(6)
    const user = cache.get("foobar")
    const res = await api.get(`/users/${user.id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body).toBe("object")
    expect(body.id).toBe(user.id)
    expect(body.username).toBe(user.username)
    expect(body.email).toBe(null)
    expect(body.permissions.length).toBe(0)
  })

  it("GET /users/:id - should respond with 404 if user has not been found", async () => {
    expect.assertions(1)
    const res = await api.get(`/users/9999`)
    expect(res.status).toBe(404)
  })

  it("PATCH /users/:id - should catch error if user with email already exists", async () => {
    expect.assertions(1)
    const user = cache.get("foobar")
    const res = await api.patch(`/users/${user.id}`, { email: EMAIL })
    expect(res.status).toBe(400)
  })


  it("POST /auth/update-self - should catch error if user with email already exists", async () => {
    expect.assertions(1)
    tokenManager.use("foobar")
    const res = await api.post("/auth/update-self", { currentPassword: "foobar", email: EMAIL })
    expect(res.status).toBe(400)
  })

  it("PATCH /users/:id - should update the user correctly", async () => {
    expect.assertions(4)
    const email = "foobar@example.com"
    const user = cache.get("foobar")
    const res = await api.patch(`/users/${user.id}`, { email: "foobar@example.com" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe(email)
    expect(body.id).toBe(user.id)
    expect(body.username).toBe(user.username)
  })

  it("POST /users/:id/permissions - should correctly assign a global permission", async () => {
    expect.assertions(6)
    const user = cache.get("foobar")
    const scopes = ["INSTANCE#ACCESS", "INSTANCE#LOGS", "USER#ACCESS", "USER#CREATE", "USER#MODIFY"]
    const res = await api.post(`/users/${user.id}/permissions`, { root: true, scopes })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(user.id)
    expect(body.permissions.length).toBe(1)
    const [permission] = body.permissions
    expect(permission.root).toBe(true)
    expect(permission.instanceId).toBe(null)
    expect(permission.scopes).toEqual(scopes)
  })

  it("POST /users - secondary user should create a new user ", async () => {
    expect.assertions(3)
    tokenManager.use("foobar")
    const res = await api.post(`/users`, { username: "bar", password: "foobar" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.username).toBe(body.username)
    expect(body.permissions.length).toBe(0)
    cache.set("bar", body)
  })

  it("POST /users/:id/permissions - secondary user should successfully assign permissions to the newly created user", async () => {
    expect.assertions(1)
    tokenManager.use("foobar")
    const user = cache.get("bar")
    const scopes = ["INSTANCE#ACCESS"]
    const res = await api.post(`/users/${user.id}/permissions`, { root: true, scopes })
    expect(res.status).toBe(200)
    const body = await res.json()
    cache.set("permId", body.id)
    //cache.set(res.json(body.))
  })

  it("DELETE /users/:id/permissions - secondary user should successfully assign permissions to the newly created user", async () => {
    expect.assertions(1)
    const user = cache.get("bar")
    const res = await api.delete(`/users/${user.id}/permissions/${cache.get("permId")}`)
    expect(res.status).toBe(200)
  })

  it("POST /users/:id/permissions - secondary user should fail assigning permissions he do not have", async () => {
    expect.assertions(1)
    tokenManager.use("foobar")
    const user = cache.get("bar")
    const scopes = ["INSTANCE#ACCESS", "PLUGINREPOSITORY#ACCESS"]
    const res = await api.post(`/users/${user.id}/permissions`, { root: true, scopes })
    expect(res.status).toBe(403)
  })

  it("DELETE /users/:id - should delete the user", async () => {
    expect.assertions(2)
    const user = cache.get("bar")
    let res = await api.delete(`/users/${user.id}`)
    expect(res.status).toBe(200)
    res = await api.get(`/users/${user.id}`)
    expect(res.status).toBe(404)
  })

})
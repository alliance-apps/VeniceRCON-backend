import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import kill from "tree-kill"
import { Api } from "./helper"


const HOST = `http://127.0.0.1:45321`
const USERNAME = "admin"
const PASSWORD = "foobar"
const EMAIL = "foo@example.com"


describe("API", () => {

  let child: ChildProcessWithoutNullStreams
  let token = ""

  const api = Api({
    host: HOST,
    token: () => token
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
        if (!msg.includes("created default user")) return
        fulfill()
      })
    }))()
  })


  afterAll(() => {
    return new Promise<void>(fulfill => {
      child.on("close", () => fulfill())
      kill(child.pid)
      process.stdout.removeAllListeners()
      process.stdin.removeAllListeners()
    })
  }, 5000)


  describe("/auth", () => {

    describe("/login", () => {

      it("POST - should fail on wrong password", async () => {
        expect.assertions(1)
        const res = await api.post("/auth/login", {
          username: USERNAME, password: "INVALID"
        })
        expect(res.status).toBe(401)
      })

      it("POST - should successfully login", async () => {
        expect.assertions(2)
        const res = await api.post("/auth/login", {
          username: USERNAME, password: PASSWORD
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(typeof data.token).toBe("string")
        token = data.token
      })

    })

    describe("/whoami", () => {
      it("GET - should get valid account data", async () => {
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
    })


    describe("/update-self", () => {
      it("POST - should disallow with wrong password", async () => {
        expect.assertions(1)
        const res = await api.post("/auth/update-self", {
          currentPassword: "INVALID",
          email: EMAIL
        })
        expect(res.status).toBe(401)
      })

      it("POST - should update the own password", async () => {
        expect.assertions(3)
        let res = await api.post("/auth/update-self", { currentPassword: PASSWORD, email: EMAIL })
        expect(res.status).toBe(200)
        res = await api.get("/auth/whoami")
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.email).toBe(EMAIL)
      })
    })
  })


  describe("/users", () => {

    let admin: any

    describe("/", () => {

      it("GET - should retrieve all users created", async () => {
        expect.assertions(5)
        const res = await api.get("/users")
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBe(1)
        admin = body[0]
        expect(admin.username).toBe(USERNAME)
        expect(admin.email).toBe(EMAIL)
      })

    })

    describe("/:id", () => {

      it("GET - should retrieve the correct user", async () => {
        expect.assertions(6)
        const res = await api.get(`/users/${admin.id}`)
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(typeof body).toBe("object")
        expect(body.id).toBe(admin.id)
        expect(admin.username).toBe(USERNAME)
        expect(admin.email).toBe(EMAIL)
        expect(admin.permissions.length).toBe(1)
      })

    })

  })

})
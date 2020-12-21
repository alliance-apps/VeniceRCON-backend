import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import fetch from "node-fetch"
import kill from "tree-kill"


const HOST = `http://127.0.0.1:45321`
const USERNAME = "admin"
const PASSWORD = "foobar"


describe("API", () => {

  let child: ChildProcessWithoutNullStreams
  //@ts-ignore
  let token = ""

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

    it("POST /auth/login - should successfully login", async () => {
      expect.assertions(2)
      const res = await fetch(`${HOST}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD })
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(typeof data.token).toBe("string")
      token = data.token
    })

    it("GET /auth/whoami - should get valid account data", async () => {
      expect.assertions(6)
      const res = await fetch(`${HOST}/api/auth/whoami`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Object.keys(data)).toEqual(["email", "permissions", "token"])
      expect(data.email).toBe(null)
      expect(data.token.v).toBe(1)
      expect(data.token.id).toBe(1)
      expect(data.token.username).toBe("admin")
    })

  })

})
import { connect } from "@service/orm"
import { initialize as initInstanceManager } from "@service/battlefield"
import { initialize as initKoa } from "@service/koa"

(async () => {
  console.log("initializing database...")
  await connect()
  console.log("initializing koa webserver...")
  await initKoa() 
  console.log("initializing instance manager...")
  await initInstanceManager() 
  console.log("initialization done!")
})()
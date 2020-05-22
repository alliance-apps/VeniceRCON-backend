import { connect } from "@service/orm"
import { initialize as initInstanceManager } from "@service/battlefield"
import { initialize as initKoa } from "@service/koa"
import { initialize as initConfig } from "@service/config"

;(async () => {
  console.log("initializing config...")
  await initConfig()
  console.log("initializing database...")
  await connect()
  console.log("initializing koa webserver...")
  await initKoa() 
  console.log("initializing instance manager...")
  await initInstanceManager() 
  console.log("initialization done!")
})()
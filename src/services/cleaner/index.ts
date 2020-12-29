import { config } from "@service/config"
import { LessThan } from "typeorm"
import winston from "winston"
import { ChatMessage } from "../orm/entity/ChatMessage"
import { Kill } from "../orm/entity/Kill"
import { LogMessage } from "../orm/entity/LogMessage"

//once every day
const executionTimeout = 24 * 60 * 60 * 1000

export function registerCleaner() {
  if (
    config.logging.removeChat === 0 &&
    config.logging.removeKills === 0 &&
    config.logging.removeLogs === 0
  ) return winston.info("not going to execute log cleanup procedures")
  setInterval(() => executeClean(), executionTimeout)
  //start with a delay
  setTimeout(() => executeClean(), 5000)
}

export async function executeClean() {
  try {
    //remove logs
    if (config.logging.removeLogs > 0) {
      winston.info("removing old log messages...")
      const response = await LogMessage.createQueryBuilder()
        .delete()
        .where({ created: olderThanDays(config.logging.removeLogs) })
        .execute()
      winston.info(`removed ${response.affected || 0} log messages`)
    }
    //remove chat
    if (config.logging.removeChat > 0) {
      winston.info("removing old chat messages...")
      const response = await ChatMessage.createQueryBuilder()
        .delete()
        .where({ created: olderThanDays(config.logging.removeChat) })
        .execute()
      winston.info(`removed ${response.affected || 0} chat messages`)
    }
    //remove kills
    if (config.logging.removeKills > 0) {
      winston.info("removing old kill events messages...")
      const response = await Kill.createQueryBuilder()
        .delete()
        .where({ created: olderThanDays(config.logging.removeKills) })
        .execute()
      winston.info(`removed ${response.affected || 0} kill events`)
    }
  } catch (e) {
    winston.error("could not clean old logs", e)
  }
}

function olderThanDays(days: number) {
  return LessThan(
    new Date(Date.now() - config.logging.removeLogs * 24 * 60 * 60 * 1000)
  )
}
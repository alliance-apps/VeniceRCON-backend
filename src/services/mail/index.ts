import nodemailer from "nodemailer"
import { config } from "@service/config"

/**
 * retrieves the smtp transport
 */
export function getTransport() {
  if (!isEnabled()) throw new Error("smtp features not enabled!")
  return nodemailer.createTransport(config.smtp.options)
}

/**
 * checks if the feature has been enabled in configuration
 */
export function isEnabled() {
  return config.smtp.enable
}

export function sendMail(to: string, subject: string, text: string) {
  const transport = getTransport()
  return transport.sendMail({
    sender: config.smtp.senderAddress,
    to, subject, text
  })
}
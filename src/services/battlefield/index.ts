import { InstanceManager } from "./libs/InstanceManager"

export let instanceManager: InstanceManager

export async function initialize() {
  instanceManager = new InstanceManager()
  await instanceManager.initialize()
}
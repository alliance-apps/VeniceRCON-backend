import { Container } from "./Container"
import { InstanceContainer } from "./InstanceContainer"
import { io } from "../koa/socket"
import { permissionManager } from "@service/permissions"
import { Permission } from "@entity/Permission"

export let containers: Container<any>[] = []

/**
 * creates a new instance container
 * @param props 
 */
export function createInstanceContainer(props: InstanceContainer.IProps) {
  const container = new InstanceContainer(props)
  containers.push(container)
  io.emit(`${container.namespace}#create`, container.getStateClone())
  return container
}

/**
 * retrieves the state of containers with a specific namespace
 * @param namespace 
 * @param user wether to retrieve states for only a specific user or all states
 */
export async function getContainerState(namespace: string, user: number|true) {
  const states = containers.filter(c => c.namespace === namespace).map(c => c.getStateClone())
  if (user === true) return states
  const allowed = await Promise.all(
    states.map(state => permissionManager.hasPermission({
      scope: Permission.Instance.ACCESS, instance: state.id, user
    }))
  )
  return states.filter((s, i) => allowed[i])
}

/**
 * removes a single container from the list
 * @param container
 */
export function removeContainer(container: Container<any>) {
  containers = containers.filter(c => c !== container)
  io.emit(`${container.namespace}#delete`, { id: container.id })
}

/**
 * retrieves the different container namespaces
 */
export function getContainerNamespaces() {
  return containers.reduce((acc, curr) => {
    if (acc.includes(curr.namespace)) return acc
    acc.push(curr.namespace)
    return acc
  }, [] as string[])
}
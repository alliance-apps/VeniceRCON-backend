import { Container } from "./Container"
import { InstanceContainer } from "./InstanceContainer"
import { io } from "../koa/socket"

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
 */
export function getContainerState(namespace: string) {
  return containers.filter(c => c.namespace === namespace).map(c => c.getStateClone())
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
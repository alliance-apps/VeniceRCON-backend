export enum InstanceAction {
  CREATE = "INSTANCE#CREATE",
  DELETE = "INSTANCE#DELETE",
  UPDATE = "INSTANCE#UPDATE"
}

export interface CreateInstanceProps {
  host: string
  port: number
  password: string
}

export interface Instance {
  id: number
  host: string
  port: number
  name: string
}
export class PrependAction<T> {

  private execHandler: () => Promise<T>
  private shouldExecHandler: () => boolean
  private minimumInterval: number
  private prependTimeout: number
  private timeout: any
  private nextAction: number
  isPaused: boolean

  constructor(props: PrependAction.Props<T>) {
    this.execHandler = props.execute
    this.shouldExecHandler = props.shouldExecute || (() => true)
    this.minimumInterval = props.minimumInterval
    this.prependTimeout = props.prependTimeout
    this.nextAction = this.minimumInterval + Date.now()
    this.isPaused = props.paused === false
    if (!this.isPaused) this.prepend()
  }

  private updateNextForcedAction(time: number = Date.now()) {
    this.nextAction = time + this.minimumInterval
  }

  private timeForTimeout() {
    if (this.prependTimeout > this.nextAction - Date.now()) {
      return this.nextAction - Date.now()
    } else {
      return this.prependTimeout
    }
  }

  /** prepends the action and delays it by set time */
  prepend() {
    if (this.isPaused) return
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      if (this.shouldExecHandler()) {
        this.execute()
      } else {
        this.updateNextForcedAction()
        this.prepend()
      }
    }, this.timeForTimeout()
    )
  }

  /** pauses the action */
  pause() {
    clearTimeout(this.timeout)
    this.isPaused = true
  }

  /** unpauses the action resets timout of minimuminterval */
  unpause() {
    this.updateNextForcedAction()
    this.isPaused = false
    this.prepend()
  }

  execute() {
    clearTimeout(this.timeout)
    this.updateNextForcedAction()
    this.prepend()
    return this.execHandler()
  }

}

export namespace PrependAction {
  export interface Props<T> {
    //callback when a action should get performed
    execute: () => Promise<T>
    //callback which gets performed if the execute should get performed
    shouldExecute?: () => boolean
    //minimum amount of time a specific action should get performed
    minimumInterval: number
    //time a action gets prepended
    prependTimeout: number
    /** wether the handler starts paused (default: true) */
    paused?: boolean
  }
}
/** basic unix like systemload display */
export class SystemLoad {

  static FIFTEEN_MINUTES = 15 * 60 * 1000
  static FIVE_MINUTES = 5 * 60 * 1000
  static ONE_MINUTE = 60 * 1000

  private history: Record<number, number> = {}

  /** retrieves the average value in a specific time */
  static calculateAverage(times: number[]) {
    return times.reduce((total, val) => total + val, 0) / times.length
  }

  /** updates the load graph with a current value */
  set(current: number, timestamp: number = Date.now()) {
    this.history[timestamp] = current
  }

  /** retrieves the current average */
  get(): [string, string, string] {
    const timings: [number[], number[], number[]] = [[], [], []]
    Object.keys(this.history).forEach(key => {
      const timestamp = parseInt(key, 10)
      const value = this.history[timestamp]
      if (timestamp > Date.now() - SystemLoad.FIFTEEN_MINUTES) {
        timings[0].push(value)
        timings[1].push(value)
        timings[2].push(value)
      } else if (timestamp > Date.now() - SystemLoad.FIVE_MINUTES) {
        timings[0].push(value)
        timings[1].push(value)
      } else if (timestamp > Date.now() - SystemLoad.ONE_MINUTE) {
        timings[0].push(value)
      } else {
        delete this.history[timestamp]
      }
    })
    return [
      SystemLoad.calculateAverage(timings[0]).toFixed(2),
      SystemLoad.calculateAverage(timings[1]).toFixed(2),
      SystemLoad.calculateAverage(timings[2]).toFixed(2)
    ]
  }

}
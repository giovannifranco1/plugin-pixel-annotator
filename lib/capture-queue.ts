/** Serializa capturas com intervalo mínimo (Chrome limita captureVisibleTab a 2 chamadas/s) sem perder pedidos. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function createCaptureQueue<T>(capture: () => Promise<T>, minIntervalMs = 550) {
  let tail: Promise<unknown> = Promise.resolve()
  let last = -Infinity
  return {
    enqueue(): Promise<T> {
      const run = async () => {
        const wait = last + minIntervalMs - Date.now()
        if (wait > 0) await sleep(wait)
        last = Date.now()
        return capture()
      }
      const result = tail.then(run, run)
      tail = result.catch(() => undefined)
      return result
    },
  }
}

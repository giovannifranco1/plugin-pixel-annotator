/** Serializa capturas com intervalo mínimo (Chrome limita captureVisibleTab a 2 chamadas/s) sem perder pedidos. */
export function createCaptureQueue<T>(
  capture: () => Promise<T>,
  minIntervalMs = 550,
  now: () => number = () => Date.now(),
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  let tail: Promise<unknown> = Promise.resolve()
  let last = -Infinity
  return {
    enqueue(): Promise<T> {
      const run = async () => {
        const wait = last + minIntervalMs - now()
        if (wait > 0) await sleep(wait)
        last = now()
        return capture()
      }
      const result = tail.then(run, run)
      tail = result.catch(() => undefined)
      return result
    },
  }
}

// Builds the ad blocker's engine from the filter lists on a worker thread. Parsing the lists takes a second or more of
// pure CPU; on the main process that froze the whole browser at first launch and every time fresh lists came in.
// The main process fetches the lists (with Lumen's network stack), this thread parses and serializes them, and the
// main process only deserializes the result (tens of milliseconds) and caches it on disk.
const { parentPort, workerData } = require('worker_threads')
try {
  const { FiltersEngine } = require('@ghostery/adblocker')
  const { text, resources } = workerData
  const engine = FiltersEngine.parse(text, {})
  if (resources !== undefined && resources !== null) engine.updateResources(resources, '' + resources.length)
  const buf = engine.serialize()
  parentPort.postMessage({ ok: true, buf }, [buf.buffer])
} catch (e) {
  parentPort.postMessage({ ok: false, error: String(e && e.message || e) })
}

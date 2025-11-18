import Dracula, { type CounterInput } from '../src/dracula'
import { SqliteCounterStore } from '../src/db/sqlite-counter-store'
import { InMemorySqliteDb } from '../src/db/inmemory-sqlite'

// These are lightweight performance-oriented tests intended to provide
// rough benchmarks and detect obvious regressions. They use the
// in-memory SQLite implementation to avoid external dependencies.

describe('Performance - SqliteCounterStore (InMemorySqliteDb)', () => {
  const SIZES = [10, 100, 1000, 10_000, 100_000]

  let dracula: Dracula

  beforeEach(async () => {
    const db = new InMemorySqliteDb()
    const store = new SqliteCounterStore(db)
    dracula = new Dracula(store)
  })

  const makeCounters = (n: number): CounterInput[] => {
    const counters: CounterInput[] = []
    for (let i = 0; i < n; i++) {
      counters.push({
        count: i,
        createdAt: new Date(),
        meta: { test: i % 2, batch: n },
      })
    }
    return counters
  }

  it('create + compute scales across batch sizes', async () => {
    for (const size of SIZES) {
      const counters = makeCounters(size)

      const start = process.hrtime.bigint()
      for (const c of counters) {
        await dracula.create(c)
      }
      const mid = process.hrtime.bigint()
      const countRes = await dracula.compute({ 'meta.test': 1 })
      const end = process.hrtime.bigint()

      const createMs = Number(mid - start) / 1_000_000
      const computeMs = Number(end - mid) / 1_000_000

      // Log basic timing information for manual inspection.
      console.log(
        `[perf][sqlite] size=${size} create=${createMs.toFixed(
          2,
        )}ms compute=${computeMs.toFixed(2)}ms countRes=${countRes}`,
      )

      expect(countRes).toBeGreaterThanOrEqual(0)
    }
  })

  it('supports concurrent create operations', async () => {
    const size = 10_000
    const counters = makeCounters(size)

    const start = process.hrtime.bigint()
    await Promise.all(counters.map((c) => dracula.create(c)))
    const end = process.hrtime.bigint()

    const totalMs = Number(end - start) / 1_000_000

    const totalCount = await dracula.compute({})

    console.log(
      `[perf][sqlite] concurrent create size=${size} totalMs=${totalMs.toFixed(
        2,
      )}ms totalCount=${totalCount}`,
    )

    expect(totalCount).toBe(size)
  })

  it('captures rough memory usage for large batch', async () => {
    const size = 50_000
    const counters = makeCounters(size)

    const memBefore = process.memoryUsage()

    for (const c of counters) {
      await dracula.create(c)
    }

    const memAfter = process.memoryUsage()

    const toMB = (bytes: number) => bytes / 1024 / 1024

    const rssDiff = toMB(memAfter.rss - memBefore.rss)
    const heapDiff = toMB(memAfter.heapUsed - memBefore.heapUsed)

    console.log(
      `[perf][sqlite] memory size=${size} rssDiff=${rssDiff.toFixed(
        2,
      )}MB heapDiff=${heapDiff.toFixed(2)}MB`,
    )

    // Basic sanity checks that memory usage is finite.
    expect(Number.isFinite(rssDiff)).toBe(true)
    expect(Number.isFinite(heapDiff)).toBe(true)
  })
})

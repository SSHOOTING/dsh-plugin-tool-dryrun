import test from 'node:test'
import assert from 'node:assert/strict'
import { name, inject, apply } from '../lib/index.js'

function makeCtx() {
  const registered = []; const logs = []; const effects = []; let disposed = 0
  return {
    registered, logs, effects,
    get disposed() { return disposed },
    commands: { register: (c) => { registered.push(c); return () => { disposed++ } } },
    effect: (body) => { effects.push([...body()]) },
    logger: { info: (m) => logs.push(m) },
  }
}

test('exports the bundle name and injects only commands', () => {
  assert.equal(name, 'dsh-plugin-tool-dryrun')
  assert.deepEqual(inject, ['commands'])
})

test('apply registers /tool-dryrun once and ties disposal to the Cordis lifecycle', () => {
  const ctx = makeCtx()
  apply(ctx)
  assert.equal(ctx.registered.length, 1)
  assert.equal(ctx.registered[0].name, 'tool-dryrun')
  assert.equal(ctx.effects.length, 1)
  ctx.effects[0][0]()
  assert.equal(ctx.disposed, 1)
  assert.match(ctx.logs[0], /loaded/)
})

test('handler returns success and survives a missing session', () => {
  const ctx = makeCtx()
  apply(ctx)
  const r = ctx.registered[0].handler({ agent: {}, rawInput: '' })
  assert.equal(r.kind, 'success')
  assert.ok(r.text.includes('tool-dryrun') || r.text.length > 0)
})

test('handler supports --json', () => {
  const ctx = makeCtx()
  apply(ctx)
  const r = ctx.registered[0].handler({ agent: {}, rawInput: '--json' })
  assert.equal(r.kind, 'success')
  assert.ok(JSON.parse(r.text))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, formatReport, redact } from '../lib/core.js'

test('analyze handles empty events', () => {
  const a = analyze([])
  assert.ok(a && typeof a === 'object')
  assert.equal(a.sampledEvents, 0)
})

test('analyze ignores malformed events without throwing', () => {
  const a = analyze([null, 1, 'x', {}, { type: 'x', data: null }])
  assert.ok(a && typeof a === 'object')
})

test('formatReport supports text and json', () => {
  const a = analyze([])
  const text = formatReport(a)
  assert.equal(typeof text, 'string')
  assert.ok(text.includes('tool-dryrun'))
  const json = formatReport(a, { json: true })
  assert.ok(JSON.parse(json))
})

test('redact strips credential-looking values', () => {
  const out = redact('token=abc123 secret: xyz')
  assert.ok(!out.includes('abc123'))
  assert.ok(out.includes('[redacted]'))
})

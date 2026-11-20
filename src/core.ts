/**
 * Pure, dependency-free core for dsh-plugin-tool-dryrun (Tool Dry-run & Permission Gate).
 * Reads only metadata from session events; never prompts, tool bodies or file contents.
 */

const SECRET_RE = /((?:token|key|secret|password|authorization|bearer)[^\s:=]{0,24}[:=]\s*)[^\s&]+/gi
const QUERY_RE = /([?&](?:token|key|secret|password|auth)=)[^&#\s]+/gi
/** Strip credential-looking substrings before anything is printed. */
export function redact(value: unknown): string {
  const text = value instanceof Error ? value.stack || value.message : String(value)
  return text.replace(SECRET_RE, '$1[redacted]').replace(QUERY_RE, '$1[redacted]')
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const WRITE_RE = /\b(write|edit|create|delete|remove|move|rename|mkdir|rm\s|apply\s*patch|shell|exec|bash|publish)\b/i
const READ_RE = /\b(read|cat|ls|get|view|search|grep|stat|list)\b/i

export function analyze(events: readonly unknown[]): any {
  const list = Array.isArray(events) ? events : []
  const calls: any[] = []
  for (const e of list) {
    if (!isRecord(e) || !isRecord(e.data)) continue
    const etype = typeof e.type === 'string' ? e.type : ''
    if (!(etype.startsWith('tool/'))) continue
    const name = typeof e.data.name === 'string' ? e.data.name : 'tool'
    const isWrite = WRITE_RE.test(name)
    const isRead = !isWrite && READ_RE.test(name)
    calls.push({
      name,
      mode: isWrite ? 'write' : isRead ? 'read' : 'unknown',
      permission: isWrite ? 'needs-approval' : 'pass-through',
      reversible: isWrite ? 'check-before-run' : 'n/a',
    })
  }
  const writes = calls.filter(c => c.mode === 'write').length
  return { sampledEvents: list.length, calls, total: calls.length, writes }
}

export function formatReport(a: any, opts: { json?: boolean } = {}): string {
  if (opts.json) return JSON.stringify(a, null, 2)
  const head = '[tool-dryrun] ' + a.total + ' tool call(s) · ' + a.writes + ' write(s) need approval'
  if (a.calls.length === 0) return head + '\n  no tool calls observed yet'
  const lines = a.calls.slice(0, 20).map(c =>
    '  ' + redact(c.name) + '  ' + c.mode.toUpperCase() +
    '  permission=' + c.permission + '  reversible=' + c.reversible)
  return [head, ...lines].join('\n')
}

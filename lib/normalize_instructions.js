// normalizeInstructions — tolerant parser shared by Chef Jennifer save flows
// and render helpers. Input can be:
//   - an array of strings
//   - a newline-separated string
//   - a single "1. foo 2. bar" blob (legacy rows)
// Output is always a clean array of step strings with leading "1." / "1)"
// numbering stripped, empty parts removed. Use instructionsToString() to get
// a newline-joined string for storage.

export function normalizeInstructionsArray(raw) {
  if (!raw) return []
  let parts = []
  if (Array.isArray(raw)) {
    parts = raw.map(String)
  } else if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    if (s.includes('\n')) {
      parts = s.split('\n')
    } else if (/\s\d+[\.\)]\s/.test(s)) {
      parts = s.split(/\s(?=\d+[\.\)]\s)/)
    } else {
      parts = [s]
    }
  } else {
    return []
  }
  return parts
    .map(p => String(p).trim().replace(/^\s*\d+[\.\)]\s*/, ''))
    .filter(Boolean)
}

// Clean newline-separated string. Backwards-compat with existing rows that
// expect a string; gives each step its own line so downstream renderers can
// split reliably.
export function instructionsToString(raw) {
  return normalizeInstructionsArray(raw).join('\n')
}

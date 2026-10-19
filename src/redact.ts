import { assertBounded, MAX_INPUT_BYTES, SafeInputError } from './safety.js';
/** Defense in depth, not a promise to recognize arbitrary secret encodings. */
export function redactText(text: string): string {
 if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_INPUT_BYTES) throw new SafeInputError('SIZE', 'Input exceeds maximum size.');
 return text
  .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[REDACTED]')
  .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi, '[REDACTED_URL]')
  .replace(/\/\/[^/\s<>"'][^\s<>"']*/g, '[REDACTED_URL]')
  .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,}|npm_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})\b/g, '[REDACTED]')
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED]')
  .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9_+/.=-]+/gi, '[REDACTED]')
  .replace(/\b(?=[A-Za-z0-9_.-]{0,128}(?:password|passwd|secret|token|credential|authorization|api[-_]?key|access[-_]?key|connection[-_]?string|private[-_]?key))([A-Za-z][A-Za-z0-9_.-]{0,255})["']?\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi, '[REDACTED]');
}
const sensitiveKey = /(?:password|passwd|secret|token|credential|authorization|api[-_]?key|access[-_]?key|connection[-_]?string|private[-_]?key|raw[-_]?logs?|^env$|environment[-_]?variables|stdout|stderr)/i;
export function redact<T>(value: T): T {
 assertBounded(value);
 function walk(v: unknown): unknown {
  if (typeof v === 'string') return redactText(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v !== null && typeof v === 'object') {
   const result: Record<string, unknown> = {};
   for (const [key, item] of Object.entries(v)) {
    const safeKey = redactText(key);
    result[safeKey] = sensitiveKey.test(key) ? '[REDACTED]' : walk(item);
   }
   return result;
  }
  return v;
 }
 return walk(value) as T;
}

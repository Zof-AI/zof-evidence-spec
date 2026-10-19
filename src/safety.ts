import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
export const MAX_INPUT_BYTES = 4 * 1024 * 1024;
export class SafeInputError extends Error {
 constructor(public readonly code: string, message: string) { super(message); this.name = 'SafeInputError'; }
}
const fail = (code: string, message: string): never => { throw new SafeInputError(code, message); };
export function checkLimit(maxBytes: number): void {
 if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_INPUT_BYTES) fail('LIMIT', 'Input limit must be between 1 and 4194304 bytes.');
}
/** Preflight JSON-compatible plain data without invoking accessors or custom serializers. */
export function assertBounded(value: unknown): void {
 let nodes = 0, bytes = 0;
 const seen = new Set<object>();
 function walk(v: unknown, depth: number): void {
  if (++nodes > 100000 || depth > 32) fail('COMPLEXITY', 'Input structure exceeds supported limits.');
  if (typeof v === 'string') bytes += Buffer.byteLength(v) + 2;
  else if (v === null || typeof v === 'boolean') bytes += 5;
  else if (typeof v === 'number') { if (!Number.isFinite(v)) fail('JSON_TYPE', 'Input must contain finite JSON values.'); bytes += 24; }
  else if (typeof v === 'object') {
   if (seen.has(v)) fail('JSON_TYPE', 'Input must not contain circular references.');
   if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail('JSON_TYPE', 'Input must contain plain JSON objects.');
   seen.add(v); bytes += 2;
   const descriptors = Object.getOwnPropertyDescriptors(v);
   for (const [key, descriptor] of Object.entries(descriptors)) {
    if (Array.isArray(v) && key === 'length') continue;
    if (!('value' in descriptor)) fail('JSON_TYPE', 'Input must not contain accessors.');
    if (['__proto__','prototype','constructor'].includes(key)) fail('UNSAFE_KEY', 'Input contains a disallowed property.');
    bytes += Buffer.byteLength(key) + 4; walk(descriptor.value, depth + 1);
   }
   seen.delete(v);
  } else fail('JSON_TYPE', 'Input must contain supported JSON values.');
  if (bytes > MAX_INPUT_BYTES) fail('SIZE', 'Input exceeds maximum size.');
 }
 walk(value, 0);
}
export function parseJson(text: string, maxBytes = MAX_INPUT_BYTES): unknown {
 checkLimit(maxBytes);
 if (typeof text !== 'string' || Buffer.byteLength(text) > maxBytes) fail('SIZE', 'Input exceeds maximum size.');
 let value: unknown;
 try { value = JSON.parse(text); } catch { fail('INVALID_JSON', 'Input is not valid JSON.'); }
 assertBounded(value); return value;
}
export function assertSafeRelativePath(value: string): void {
 if (typeof value !== 'string' || !value || value.length > 1024 || /[\\\x00-\x1f\x7f:%?#]/.test(value) || path.isAbsolute(value) || value.split('/').some(p => !p || p === '.' || p === '..')) fail('UNSAFE_PATH', 'Path must be a safe relative file path.');
}
/** Reject every symlink component, including links that currently resolve inside root. */
export async function safeReadFile(root: string, relativePath: string, maxBytes = MAX_INPUT_BYTES): Promise<Buffer> {
 checkLimit(maxBytes); assertSafeRelativePath(relativePath);
 let handle;
 try {
  const base = await realpath(root);
  let current = base;
  for (const segment of relativePath.split('/')) {
   current = path.join(current, segment);
   if ((await lstat(current)).isSymbolicLink()) fail('SYMLINK', 'Symbolic links are not accepted.');
  }
  const resolved = await realpath(current);
  if (resolved !== current || !resolved.startsWith(base + path.sep)) fail('UNSAFE_PATH', 'Path is outside the permitted root.');
  handle = await open(current, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const stat = await handle.stat();
  if (!stat.isFile()) fail('FILE_TYPE', 'Input must be a regular file.');
  if (stat.size > maxBytes) fail('SIZE', 'Input exceeds maximum size.');
  // A second path check narrows directory replacement races. Callers must use a stable root.
  if (await realpath(current) !== resolved) fail('UNSAFE_PATH', 'Input path changed during reading.');
  const buffer = Buffer.alloc(maxBytes + 1);
  let offset = 0;
  while (offset < buffer.length) {
   const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null);
   if (!bytesRead) break; offset += bytesRead;
  }
  if (offset > maxBytes) fail('SIZE', 'Input exceeds maximum size.');
  return buffer.subarray(0, offset);
 } catch (error) {
  if (error instanceof SafeInputError) throw error;
  throw new SafeInputError('FILE_READ', 'Unable to read permitted input file.');
 } finally { await handle?.close(); }
}
export async function safeReadJson(root: string, relativePath: string, maxBytes = MAX_INPUT_BYTES): Promise<unknown> {
 return parseJson((await safeReadFile(root, relativePath, maxBytes)).toString('utf8'), maxBytes);
}

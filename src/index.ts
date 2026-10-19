import { randomUUID } from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { evidenceSchema } from './schema.js';
import { assertBounded, parseJson, SafeInputError } from './safety.js';
import { redact } from './redact.js';
import type { Evidence, EvidenceInput, ValidationResult } from './types.js';
export * from './types.js';
export * from './safety.js';
export * from './redact.js';
export { evidenceSchema } from './schema.js';
const ajv = new Ajv2020({ strict: true, allErrors: false, ownProperties: true, validateFormats: false });
const validate = ajv.compile(evidenceSchema);
const invalid = (code: string, message: string): ValidationResult => ({ valid: false, errors: [{code,message}] });
/** Offline shape/consistency validation; never authenticates the producer. */
export function validateEvidence(input: unknown): ValidationResult {
 try { assertBounded(input); } catch (error) { return invalid(error instanceof SafeInputError ? error.code : 'INVALID_INPUT', 'Evidence is not supported bounded JSON data.'); }
 if (!validate(input)) return invalid('SCHEMA', 'Evidence does not match schema version 1.0.0.');
 const value = input as Evidence;
 if (!Number.isFinite(Date.parse(value.createdAt)) || new Date(value.createdAt).toISOString().slice(0,19) !== value.createdAt.slice(0,19)) return invalid('TIMESTAMP', 'Evidence timestamp is invalid.');
 if (value.execution.result === 'pass' && (value.execution.status !== 'completed' || value.tests.some(t => t.status === 'failed' || t.status === 'error'))) return invalid('INCONSISTENT_RESULT', 'Passing evidence must be complete and contain no failed tests.');
 return {valid: true, errors: []};
}
export function createEvidence(input: EvidenceInput): Evidence {
 assertBounded(input);
 const evidence = redact({ schemaVersion: '1.0.0', id: randomUUID(), createdAt: new Date().toISOString(), source: {repository:null,commit:null}, execution: {status:'missing',result:'unknown'}, findings:[], tests:[], artifacts:[], ...input }) as Evidence;
 const result = validateEvidence(evidence);
 if (!result.valid) throw new SafeInputError(result.errors[0]!.code, result.errors[0]!.message);
 return evidence;
}
export function parseEvidence(text: string): Evidence {
 const value = parseJson(text); const result = validateEvidence(value);
 if (!result.valid) throw new SafeInputError(result.errors[0]!.code, result.errors[0]!.message);
 return value as Evidence;
}
export function serializeEvidence(evidence: Evidence): string {
 const safe = redact(evidence); const result = validateEvidence(safe);
 if (!result.valid) throw new SafeInputError(result.errors[0]!.code, result.errors[0]!.message);
 return JSON.stringify(safe, null, 2) + '\n';
}

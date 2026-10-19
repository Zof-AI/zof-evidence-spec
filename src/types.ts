export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface Finding { id: string; severity: 'info'|'low'|'medium'|'high'|'critical'; message: string; path?: string; line?: number }
export interface TestResult { name: string; status: 'passed'|'failed'|'skipped'|'error'; durationMs?: number }
export interface Artifact { name: string; path: string; mediaType?: string; sizeBytes?: number; sha256?: string }
export interface Evidence {
 schemaVersion: '1.0.0'; id: string; createdAt: string;
 source: { repository: string | null; commit: string | null };
 tool: { name: string; version: string }; type: string;
 execution: { status: 'completed'|'partial'|'missing'|'error'; result: 'pass'|'fail'|'unknown' };
 findings: Finding[]; tests: TestResult[]; artifacts: Artifact[];
 provenance?: { producer?: string; runId?: string; workflow?: string };
 integrity?: { algorithm: 'sha256'; digest: string };
 signatures?: Array<{ algorithm: 'ed25519'; keyId: string; value: string }>;
 policy?: { result: 'pass'|'fail'|'unknown'; rules: Array<{id:string;result:'pass'|'fail'|'unknown'}> };
 environment?: { os?: string; architecture?: string; runtime?: string; ci?: string };
 extensions?: Record<string, JsonValue>;
}
export type EvidenceInput = Partial<Evidence> & Pick<Evidence, 'tool'|'type'>;
export interface ValidationResult { valid: boolean; errors: Array<{code:string;message:string}> }

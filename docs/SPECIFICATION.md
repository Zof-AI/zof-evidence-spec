# Evidence 1.0.0

The canonical JSON Schema is `schemas/evidence-1.0.0.schema.json` (Draft 2020-12); `evidenceSchema` exports the identical schema object. The schema's example.invalid identifier is an identifier only and is never fetched. No remote schema resolution occurs.

Required fields: `schemaVersion`, `id`, `createdAt`, `source`, `tool`, `type`, `execution`, `findings`, `tests`, and `artifacts`. `source` holds `repository` and `commit`, each either a string or null for unavailable information. `tool` holds a name and version. `createdAt` is an actual UTC ISO timestamp. Identifiers are opaque producer-assigned strings; creation generates a UUID by default.

Execution status is `completed`, `partial`, `missing`, or `error`. Result is `pass`, `fail`, or `unknown`. Only completed execution can pass. A failed or errored test prohibits pass. Partial execution may contain a known failure, but cannot establish passing verification. Non-test checks may legitimately have no test entries. Report importers must record missing evidence when their required test report is absent.

Each test records its name, status (`passed`, `failed`, `skipped`, `error`) and optional nonnegative duration in milliseconds. Each finding records id, severity (`info`, `low`, `medium`, `high`, `critical`), message and optional safe relative source path and positive line. Artifacts have a name and safe relative path, optionally a media type, byte count and SHA-256 digest. Artifact references are inert metadata: no fetch, read or extraction occurs during validation.

Optional provenance contains producer, runId and workflow strings. Environment metadata is limited to os, architecture, runtime and ci, never process environment variables. Integrity records a SHA-256 algorithm label and 64 lowercase hexadecimal characters. Ed25519 signatures contain keyId and a 64-byte base64 value. The library checks their shape only; it does not hash payloads, verify signatures, resolve keys, trust provenance, or attest authenticity. Redacting an already signed document changes its content and requires a new external signature.

Optional policy contains result and individual rule id/result pairs. Extensions are bounded JSON under reverse-DNS namespaces such as `org.example.coverage`. Namespaces have lowercase alphanumeric dot/dash components. Unknown top-level fields are rejected. Extensions survive parse/serialization except for documented redaction. Consumer policies must not treat unknown extension fields as trusted instructions.

## Versioning and compatibility

Package version 0.1.0 implements exactly schema 1.0.0. Unknown schema versions are rejected. A major schema version changes required meaning or structure; minor schema versions may add optional capabilities only after an explicit compatibility review. Patch versions clarify existing semantics. Consumers must negotiate new versions rather than assume future schemas are compatible. Extensions are the supported way to preserve vendor-specific data without changing the core.

## Bounds

Documents are at most 4 MiB, depth 32 and 100,000 JSON nodes. Strings and arrays have tighter schema-specific bounds. Nonfinite numbers, circular references, non-plain objects, getters and prototype-manipulation keys are rejected. These limits apply before schema validation. Invalid reports generate fixed errors that never quote report content or field names.

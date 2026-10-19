# API and implementation guide

All exports are ESM. Type declarations are included.

- `createEvidence(input)` requires tool/type, assigns missing/unknown execution, null source references, a UUID/time and empty arrays by default. It redacts data and validates the result. Pass must be supplied based on a real completed check.
- `validateEvidence(unknown)` returns `{valid, errors:[{code,message}]}` without mutating input. It checks structure, bounds, timestamp and execution consistency. It does not redact or authenticate.
- `parseEvidence(text)` parses bounded JSON and validates, preserving supplied data. Do not log its raw input or serialize it without `serializeEvidence`.
- `serializeEvidence(evidence)` redacts then validates and returns formatted JSON with a newline.
- `redact(value)` returns a bounded JSON copy with sensitive-key values masked. `redactText(text)` masks known tokens, key assignments, bearer/basic credentials, JWT-like text and private-key blocks. All URI strings with a scheme and `://` are removed, including usernames, hosts, paths, queries and fragments. Redaction is defense in depth and cannot recognize arbitrary encodings or every possible secret.
- `parseJson(text, maxBytes=4194304)` safely parses general bounded JSON. Limits may be lowered, never raised above 4 MiB.
- `safeReadFile(root, relativePath, maxBytes=4194304)` returns a Buffer from a bounded regular file. `safeReadJson` reads and parses bounded JSON. Symlinks, unsafe relative paths, nonregular files and URLs are rejected. Missing files return a fixed `FILE_READ` error.
- `assertSafeRelativePath(path)` accepts relative POSIX paths without dot segments, empty components, control characters, backslashes, percent escapes, colon, query or fragment markers.
- `SafeInputError` exposes a fixed `code` and safe message. Callers should handle known error codes, never echo caught external errors or untrusted input.

The canonical types are exported as Evidence, EvidenceInput, Finding, TestResult, Artifact, JsonValue and ValidationResult. `MAX_INPUT_BYTES` and `evidenceSchema` are exported as values.

## Reproducibility

Pass explicit id and createdAt to produce deterministic documents. Evidence producers should record the actual commit independently and distinguish unsigned source assertions from authenticated attestations.

## Limitations

No signature verification, hosted API, artifact download, archive extraction, disk-write API, or secret-classification service is included. Safe file reads assume a stable input root controlled by the caller; JavaScript's portable filesystem API cannot eliminate all concurrent hostile parent-directory replacement races. Use isolated, immutable staging directories when importing adversarial artifacts. The parser operates on JSON, not arbitrary JavaScript proxy objects. Full schema rejection details are deliberately suppressed to prevent secrets in property names from appearing in errors.

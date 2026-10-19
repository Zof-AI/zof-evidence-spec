# Security policy

The 0.1.x line is the initial supported candidate. Local analyses are bounded and offline unless an operation is explicitly documented otherwise. Do not provide production secrets or execute untrusted generated code.

Use GitHub private vulnerability reporting when enabled for this repository. If it is unavailable, contact an organization owner through an already verified private channel; do not file credentials, exploit details, or customer data in a public issue. A verified reporting channel must be enabled before public release. Reports will be triaged, reproduced using synthetic data, fixed and reviewed before coordinated disclosure. No response SLA is promised during prerelease development.

The validator does not fetch schema identifiers or artifact URLs. File reads are restricted to bounded regular files under a caller-selected stable root and reject all symlink components. Archives are outside scope. Raw input, arbitrary CI environment variables and application logs must not be copied into evidence. Known token/key/URL redaction supplements data minimization; it does not prove that arbitrary content is secret-free. Schema validity and authenticity are separate; unsigned evidence is not authenticated. See docs/API.md for the filesystem race assumption and exact limits.

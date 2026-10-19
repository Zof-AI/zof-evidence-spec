# Security policy

The 0.1.x line is the initial supported release line. Local analyses are bounded and offline unless an operation is explicitly documented otherwise. Do not provide production secrets or execute untrusted generated code.

Use GitHub private vulnerability reporting when enabled for this repository. If it is unavailable, contact an organization owner through an already verified private channel; do not file credentials, exploit details, or customer data in a public issue. Reports will be triaged, reproduced using synthetic data, fixed and reviewed before coordinated disclosure. No response SLA is promised for this initial release.

The validator does not fetch schema identifiers or artifact URLs. File reads are restricted to bounded regular files through directory descriptors under a caller-selected root and reject symlink components, hard-linked inputs and special files. Archives are outside scope. Raw input, arbitrary CI environment variables and application logs must not be copied into evidence. Known token/key/URL redaction supplements data minimization; it does not prove that arbitrary content is secret-free. Schema validity and authenticity are separate; unsigned evidence is not authenticated. See docs/API.md for descriptor-based filesystem controls and exact limits.

Filesystem operations use bounded, directory-relative descriptors on Linux/macOS with Python 3.10 or newer. Symlinks, hard-linked inputs, special files and traversal are rejected. Open descriptors remain attached to the original directory when names change. File contents can still change during a read or snapshot; this is not an atomic filesystem snapshot. Windows filesystem operations fail closed; in-memory JSON validation and analysis do not require the file helper.

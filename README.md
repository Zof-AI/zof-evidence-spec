# Zof Evidence Specification

A portable, vendor-neutral JSON format for software verification results, with an offline TypeScript validator and CLI. Schema validity describes structure and consistency; it does **not** establish that tests actually ran or authenticate a producer.

This is a local 0.1.0 release candidate. The proposed `@zof-ai/evidence-spec` name, repository URL, license and publication remain subject to approval. No registry release is claimed.

<!-- ZOF_RELEASE_INSTALL_START -->
## Install from GitHub source

Requires Node.js 22 or 24, npm, and Git. Filesystem operations require Linux or macOS with Python 3.10 or newer; Windows file operations fail closed. Clone this repository and explicitly prepare its reviewed release dependencies:

```sh
git clone https://github.com/Zof-AI/zof-evidence-spec.git
cd zof-evidence-spec
node scripts/bootstrap.mjs --allow-network
npm ci --ignore-scripts --prefer-offline
npm run build
npm test
```

The bootstrap downloads only the exact public `v0.1.0` dependency assets listed in `scripts/release-dependencies.json`, verifies SHA256 and byte size, and adds them to the npm cache. It does not extract archives, run package scripts, collect application data, or send credentials. Downloads require the explicit flag and follow only HTTPS GitHub asset redirects. Installation then fetches ordinary third-party dependencies from npm. Use a writable npm cache; set `npm_config_cache` consistently for both commands if needed. An unavailable asset, changed hash, or oversized response stops installation.

GitHub source and release artifacts are the initial distribution channel. These instructions do not claim that `@zof-ai` packages are published on npm or that the VS Code extension is listed in Marketplace.
<!-- ZOF_RELEASE_INSTALL_END -->

## Quick start

Requires Node.js 22 or newer and npm. In this checkout:

```sh
npm ci --ignore-scripts
npm run build
node dist/cli.js validate passing.json --root examples
node dist/cli.js validate partial.json --root examples
node dist/cli.js validate static-analysis.json --root examples
npm test
```

The three examples demonstrate completed tests, incomplete tests, and a static finding. A valid incomplete document prints `valid: true` because it accurately records partial execution; its result remains `unknown`.

## Library

```js
import { createEvidence, validateEvidence, serializeEvidence } from '@zof-ai/evidence-spec';
const evidence = createEvidence({
  tool: { name: 'my-checker', version: '1.0.0' },
  type: 'tests',
  source: { repository: 'example/project', commit: null },
  execution: { status: 'completed', result: 'pass' },
  tests: [{ name: 'returns expected value', status: 'passed' }]
});
console.log(validateEvidence(evidence));
console.log(serializeEvidence(evidence));
```

Install a reviewed local tarball using `npm install /path/to/zof-ai-evidence-spec-0.1.0.tgz` until publication is authorized. `npm pack` requires a prior build; source maps and tests are excluded from the package allowlist.

`zof-evidence validate <relative-file.json> --root <directory>` exits 0 for valid structure and 1 for invalid input. It never reports verification success based on schema validity.

Read [the specification](docs/SPECIFICATION.md), [API and implementation guide](docs/API.md), [security](SECURITY.md), and [release requirements](docs/RELEASE.md).

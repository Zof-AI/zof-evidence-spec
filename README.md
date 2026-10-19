# Zof Evidence Specification

A portable, vendor-neutral JSON format for software verification results, with an offline TypeScript validator and CLI. Schema validity describes structure and consistency; it does **not** establish that tests actually ran or authenticate a producer.

This is a local 0.1.0 release candidate. The proposed `@zof-ai/evidence-spec` name, repository URL, license and publication remain subject to approval. No registry release is claimed.

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

#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { parseEvidence, safeReadFile, SafeInputError } from './index.js';
try {
 const { values, positionals } = parseArgs({ options: { root:{type:'string',default:'.'},help:{type:'boolean'},version:{type:'boolean'} },allowPositionals:true });
 if (values.help) console.log('Usage: zof-evidence validate <relative-file.json> [--root directory]\nExit codes: 0 valid, 1 invalid/input error. Validation does not prove authenticity.');
 else if (values.version) console.log('0.1.0');
 else {
  if (positionals.length !== 2 || positionals[0] !== 'validate') throw new SafeInputError('USAGE','Expected validate and a relative JSON filename.');
  parseEvidence((await safeReadFile(values.root!,positionals[1]!)).toString('utf8'));
  console.log(JSON.stringify({valid:true,authenticity:'not-verified'}));
 }
} catch (error) {
 console.error(JSON.stringify({valid:false,code:error instanceof SafeInputError?error.code:'INPUT',message:error instanceof SafeInputError?error.message:'Invalid command or input.'})); process.exitCode=1;
}

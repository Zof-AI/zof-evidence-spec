import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const cli=(...args)=>spawnSync(process.execPath,['dist/cli.js',...args],{encoding:'utf8'});
test('CLI validates every documented example',()=>{for(const name of readdirSync('examples').filter(n=>n.endsWith('.json'))){const result=cli('validate',name,'--root','examples');assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{valid:true,authenticity:'not-verified'});}});
test('CLI bad path and syntax return fixed errors',()=>{for(const args of [['validate','../secret'],['validate','https://secret.invalid'],['--not-supported=secret']]){const result=cli(...args);assert.equal(result.status,1);assert.doesNotMatch(result.stderr,/secret/);}});
test('CLI help and version work offline',()=>{assert.equal(cli('--help').status,0);assert.equal(cli('--version').stdout.trim(),'0.1.0');});

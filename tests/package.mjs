import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const temp=await mkdtemp(path.join(tmpdir(),'zof-package-'));
const run=(cmd,args,cwd=process.cwd())=>{const r=spawnSync(cmd,args,{cwd,encoding:'utf8'});assert.equal(r.status,0,`Command failed: ${cmd} ${r.stderr}`);return r.stdout;};
try {
 const packed=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',temp]))[0];
 assert.ok(packed.files.some(f=>f.path==='dist/index.d.ts'));
 assert.ok(packed.files.some(f=>f.path==='schemas/evidence-1.0.0.schema.json'));
 assert.ok(packed.files.every(f=>!/(?:^|\/)(?:src|tests|orchestration|\.git)(?:\/|$)|\.map$/.test(f.path)));
 await writeFile(path.join(temp,'package.json'),'{"private":true,"type":"module"}');
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund',path.join(temp,packed.filename)],temp);
 run(process.execPath,['--input-type=module','-e',"import {createEvidence,validateEvidence} from '@zof-ai/evidence-spec'; const e=createEvidence({tool:{name:'consumer',version:'1'},type:'smoke'}); if(!validateEvidence(e).valid)process.exit(1);"],temp);
 run(process.execPath,[path.join(temp,'node_modules/@zof-ai/evidence-spec/dist/cli.js'),'validate','passing.json','--root',path.join(temp,'node_modules/@zof-ai/evidence-spec/examples')],temp);
 console.log(JSON.stringify({package:'passed',entries:packed.files.length,tests:4}));
} finally {await rm(temp,{recursive:true,force:true});}

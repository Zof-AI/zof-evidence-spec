import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, link, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {safeReadFile,safeWriteFiles,safeListDirectory,safeAppendFile,safeGit,runTrustedCommand} from '../dist/index.js';
const fixture=async fn=>{const root=await mkdtemp(path.join(tmpdir(),'zof-handles-'));try{await fn(root)}finally{await rm(root,{recursive:true,force:true})}};
test('exclusive writes create parents and never overwrite existing files',()=>fixture(async root=>{
 await safeWriteFiles(root,[{path:'generated/a.txt',content:'original'}],{createParents:true});
 await assert.rejects(safeWriteFiles(root,[{path:'generated/a.txt',content:'replacement'}]));
 assert.equal((await readFile(path.join(root,'generated/a.txt'))).toString(),'original');
}));
test('root and parent symlinks cannot redirect reads or writes',()=>fixture(async root=>{
 await mkdir(path.join(root,'outside'));await writeFile(path.join(root,'outside/data'),'outside');await symlink(path.join(root,'outside'),path.join(root,'redirect'));
 await assert.rejects(safeReadFile(path.join(root,'redirect'),'data'));
 await assert.rejects(safeWriteFiles(root,[{path:'redirect/new',content:'x'}],{createParents:true}));
 await assert.rejects(safeListDirectory(root,'redirect'));
 await assert.rejects(readFile(path.join(root,'outside/new')));
}));
test('hard-linked inputs and runner files are rejected',()=>fixture(async root=>{
 await writeFile(path.join(root,'data'),'private');await link(path.join(root,'data'),path.join(root,'alias'));
 await assert.rejects(safeReadFile(root,'alias'),e=>e.code==='FILE_TYPE');await assert.rejects(safeAppendFile(root,'alias','x'));
 assert.equal((await readFile(path.join(root,'data'))).toString(),'private');
}));
test('bounded listing returns types without following links',()=>fixture(async root=>{
 await mkdir(path.join(root,'folder'));await writeFile(path.join(root,'data'),'x');await symlink('data',path.join(root,'alias'));
 const result=await safeListDirectory(root);assert.deepEqual(new Set(result.entries.map(e=>e.kind)),new Set(['directory','file','symlink']));
 assert.equal((await safeListDirectory(root,'',1)).truncated,true);
}));
test('runner append requires an existing regular file',()=>fixture(async root=>{
 await writeFile(path.join(root,'output'),'a');await safeAppendFile(root,'output','b');assert.equal((await readFile(path.join(root,'output'))).toString(),'ab');
 await assert.rejects(safeAppendFile(root,'absent','x'));
}));
test('Git refuses external metadata and ancestor discovery',()=>fixture(async root=>{
 const outside=path.join(root,'outside');const workspace=path.join(root,'workspace');await mkdir(outside);await mkdir(workspace);
 execFileSync('git',['init','-q',outside]);await writeFile(path.join(workspace,'.git'),'gitdir: '+path.join(outside,'.git')+'\n');
 await assert.rejects(safeGit(workspace,['rev-parse','--show-toplevel']));
 await rm(path.join(workspace,'.git'));await assert.rejects(safeGit(workspace,['rev-parse','--show-toplevel']));
}));
test('Git reads local history in a sanitized snapshot and rejects alternates',()=>fixture(async root=>{
 execFileSync('git',['init','-q',root]);await writeFile(path.join(root,'input'),'first');execFileSync('git',['-C',root,'add','input']);execFileSync('git',['-C',root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
 await writeFile(path.join(root,'input'),'second');const diff=await safeGit(root,['diff','--no-ext-diff','--no-textconv','--unified=0','HEAD','--']);assert.match(diff,/second/);
 await writeFile(path.join(root,'.git/objects/info/alternates'),'/outside\n');await assert.rejects(safeGit(root,['rev-parse','--verify','HEAD']));
}));
test('trusted command requires consent, uses selected cwd, discards logs and times out',()=>fixture(async root=>{
 await assert.rejects(runTrustedCommand(root,[process.execPath,'-e','process.exit(0)'],{allowExecution:false,timeoutMs:1000}));
 assert.equal(await runTrustedCommand(root,[process.execPath,'-e','console.log("synthetic private log");process.exit(3)'],{allowExecution:true,timeoutMs:1000}),3);
 await assert.rejects(runTrustedCommand(root,[process.execPath,'-e','setInterval(()=>{},100)'],{allowExecution:true,timeoutMs:100}),e=>['TIMEOUT','FILE_ACCESS'].includes(e.code));
}));

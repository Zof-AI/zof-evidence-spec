import { spawn } from 'node:child_process';
import path from 'node:path';
import { assertSafeRelativePath, checkLimit, MAX_INPUT_BYTES, SafeInputError } from './safety.js';

// Node does not expose openat. A fixed, isolated Python stdlib helper retains
// directory descriptors instead of checking a pathname and reopening it later.
const HELPER = String.raw`
import base64, errno, json, os, selectors, signal, stat, subprocess, sys, tempfile, time
class Rejected(Exception):
 def __init__(self, code): self.code=code
def reject(code): raise Rejected(code)
def relative(value):
 if not isinstance(value,str) or not value or len(value)>1024 or any(ord(c)<32 or ord(c)==127 or c in '\\:%?#' for c in value) or any(p in ('','.','..') for p in value.split('/')): reject('UNSAFE_PATH')
 return value.split('/')
DF=os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_CLOEXEC
def root_open(value):
 if not isinstance(value,str) or not value.startswith('/') or len(value)>8192 or '\x00' in value: reject('UNSAFE_PATH')
 if sys.platform=='darwin':
  for alias in ('/var','/tmp','/etc'):
   if value==alias or value.startswith(alias+'/'): value='/private'+value; break
 fd=os.open('/',DF)
 try:
  for component in value.split('/')[1:]:
   if component=='': continue
   if component in ('.','..'): reject('UNSAFE_PATH')
   child=os.open(component,DF,dir_fd=fd); os.close(fd); fd=child
  return fd
 except: os.close(fd); raise
def parent(root,parts,create=False):
 fd=os.dup(root)
 try:
  for component in parts[:-1]:
   if create:
    try: os.mkdir(component,0o700,dir_fd=fd)
    except FileExistsError: pass
   child=os.open(component,DF,dir_fd=fd); os.close(fd); fd=child
  return fd
 except: os.close(fd); raise
def regular(fd,limit):
 s=os.fstat(fd)
 if not stat.S_ISREG(s.st_mode) or s.st_nlink!=1: reject('FILE_TYPE')
 if s.st_size>limit: reject('SIZE')
def read(root,q):
 parts=relative(q['path']); p=parent(root,parts)
 try: fd=os.open(parts[-1],os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC,dir_fd=p)
 finally: os.close(p)
 try:
  regular(fd,q['limit']); chunks=[]; count=0
  while count<=q['limit']:
   b=os.read(fd,min(65536,q['limit']+1-count))
   if not b: break
   chunks.append(b); count+=len(b)
  if count>q['limit']: reject('SIZE')
  return base64.b64encode(b''.join(chunks)).decode('ascii')
 finally: os.close(fd)
def write(root,q):
 handles=[]
 try:
  for item in q['files']:
   parts=relative(item['path']); p=parent(root,parts,q.get('createParents',False))
   try: fd=os.open(parts[-1],os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC,0o600,dir_fd=p)
   finally: os.close(p)
   handles.append((fd,base64.b64decode(item['data'],validate=True)))
  for fd,data in handles:
   view=memoryview(data)
   while view: view=view[os.write(fd,view):]
  return True
 finally:
  for fd,_ in handles: os.close(fd)
def listing(root,q):
 fd=os.dup(root)
 try:
  if q['path']:
   for component in relative(q['path']):
    child=os.open(component,DF,dir_fd=fd); os.close(fd); fd=child
  result=[]
  with os.scandir(fd) as entries:
   for entry in entries:
    if len(result)>=q['limit']: return {'entries':result,'truncated':True}
    s=entry.stat(follow_symlinks=False)
    kind='symlink' if stat.S_ISLNK(s.st_mode) else 'directory' if stat.S_ISDIR(s.st_mode) else 'file' if stat.S_ISREG(s.st_mode) else 'other'
    result.append({'name':entry.name,'kind':kind})
  return {'entries':result,'truncated':False}
 finally: os.close(fd)
def append(root,q):
 parts=relative(q['path']); p=parent(root,parts)
 try: fd=os.open(parts[-1],os.O_WRONLY|os.O_APPEND|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC,dir_fd=p)
 finally: os.close(p)
 try:
  data=base64.b64decode(q['data'],validate=True); regular(fd,4194304-len(data)); view=memoryview(data)
  while view: view=view[os.write(fd,view):]
  return True
 finally: os.close(fd)
def snapshot(root,destination):
 total=0; count=0
 def copy(fd,dest,depth=0,metadata=False):
  nonlocal total,count
  if depth>64: reject('SIZE')
  with os.scandir(fd) as entries:
   for entry in entries:
    count+=1
    if count>50000: reject('SIZE')
    name=entry.name
    if metadata and name in ('alternates','http-alternates','commondir','gitdir'): reject('GIT_FAILED')
    if name in ('node_modules','.venv','venv','__pycache__'): continue
    if name=='.git':
     if depth==0: continue
     reject('GIT_FAILED')
    st=entry.stat(follow_symlinks=False); target=os.path.join(dest,name)
    if stat.S_ISDIR(st.st_mode):
     child=os.open(name,DF,dir_fd=fd)
     try: os.mkdir(target,0o700); copy(child,target,depth+1,metadata)
     finally: os.close(child)
    elif stat.S_ISREG(st.st_mode):
     source=os.open(name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC,dir_fd=fd)
     try:
      regular(source,32*1024*1024); written=0
      with open(target,'xb') as output:
       while True:
        data=os.read(source,65536)
        if not data: break
        written+=len(data); total+=len(data)
        if written>32*1024*1024 or total>256*1024*1024: reject('SIZE')
        output.write(data)
      os.chmod(target,0o700 if st.st_mode&0o111 else 0o600)
     finally: os.close(source)
    else: reject('FILE_TYPE')
 g=os.open('.git',DF,dir_fd=root)
 try:
  for forbidden in ('commondir','gitdir'):
   try: os.stat(forbidden,dir_fd=g,follow_symlinks=False); reject('GIT_FAILED')
   except FileNotFoundError: pass
  # Git object alternates could otherwise read another repository's objects.
  objects=os.open('objects',DF,dir_fd=g)
  try:
   try: info=os.open('info',DF,dir_fd=objects)
   except FileNotFoundError: info=None
   if info is not None:
    try:
     for forbidden in ('alternates','http-alternates'):
      try: os.stat(forbidden,dir_fd=info,follow_symlinks=False); reject('GIT_FAILED')
      except FileNotFoundError: pass
    finally: os.close(info)
  finally: os.close(objects)
  copy(root,destination)
  gd=os.path.join(destination,'.git'); os.mkdir(gd,0o700)
  for name in ('HEAD','index','packed-refs','shallow'):
   try: data=base64.b64decode(read(g,{'path':name,'limit':4194304}))
   except FileNotFoundError: continue
   total+=len(data)
   if total>256*1024*1024: reject('SIZE')
   with open(os.path.join(gd,name),'xb') as output: output.write(data)
  for name in ('objects','refs'):
   try: fd=os.open(name,DF,dir_fd=g)
   except FileNotFoundError: continue
   try: os.mkdir(os.path.join(gd,name),0o700); copy(fd,os.path.join(gd,name),1,True)
   finally: os.close(fd)
  with open(os.path.join(gd,'config'),'x') as config: config.write('[core]\nrepositoryformatversion = 0\nbare = false\nfilemode = true\n')
 finally: os.close(g)
def command(root,q):
 if q['op']=='git':
  with tempfile.TemporaryDirectory(prefix='zof-git-') as workspace:
   snapshot(root,workspace)
   os.chdir(workspace)
   result=git_command(q)
   if q['args']==['rev-parse','--show-toplevel']: return base64.b64encode((q['root']+'\n').encode()).decode('ascii')
   return result
 os.fchdir(root)
 p=subprocess.Popen(q['args'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env={'PATH':os.environ.get('PATH','/usr/bin:/bin')})
 try: return p.wait(timeout=q['timeoutMs']/1000)
 except subprocess.TimeoutExpired: p.kill(); p.wait(); reject('TIMEOUT')
def git_command(q):
  argv=['git','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-c','diff.external=','-c','core.quotePath=true']+q['args']
  env={'PATH':os.environ.get('PATH','/usr/bin:/bin'),'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_OPTIONAL_LOCKS':'0','GIT_TERMINAL_PROMPT':'0','LC_ALL':'C'}
  p=subprocess.Popen(argv,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,env=env)
  selector=selectors.DefaultSelector(); selector.register(p.stdout,selectors.EVENT_READ); chunks=[]; count=0; start=time.monotonic()
  try:
   while selector.get_map():
    if time.monotonic()-start>15: reject('TIMEOUT')
    for key,_ in selector.select(.1):
     data=os.read(key.fd,65536)
     if not data: selector.unregister(key.fileobj); continue
     count+=len(data)
     if count>q['limit']: reject('SIZE')
     chunks.append(data)
   if p.wait(timeout=1)!=0: reject('GIT_FAILED')
   return base64.b64encode(b''.join(chunks)).decode('ascii')
  finally:
   if p.poll() is None: p.kill(); p.wait()
   selector.close()
def main():
 if os.name!='posix' or sys.version_info<(3,10): reject('UNSUPPORTED_RUNTIME')
 raw=sys.stdin.buffer.read(8388609)
 if len(raw)>8388608: reject('SIZE')
 q=json.loads(raw); root=root_open(q['root'])
 try:
  op=q['op']
  if op=='read': return read(root,q)
  if op=='write': return write(root,q)
  if op=='list': return listing(root,q)
  if op=='append': return append(root,q)
  if op in ('git','execute'): return command(root,q)
  reject('INVALID_OPERATION')
 finally: os.close(root)
try: print(json.dumps({'ok':True,'value':main()},ensure_ascii=True))
except Rejected as e: print(json.dumps({'ok':False,'code':e.code}))
except OSError as e:
 code='FILE_MISSING' if e.errno==errno.ENOENT else 'FILE_EXISTS' if e.errno==errno.EEXIST else 'SYMLINK' if e.errno in (errno.ELOOP,errno.ENOTDIR) else 'FILE_ACCESS'
 print(json.dumps({'ok':False,'code':code}))
except Exception: print(json.dumps({'ok':False,'code':'FILE_ACCESS'}))
`;

let active = 0;
const pending: Array<() => void> = [];
async function run(root: string, request: Record<string, unknown>, timeoutMs = 30000, signal?: AbortSignal): Promise<unknown> {
 if (process.platform !== 'linux' && process.platform !== 'darwin') throw new SafeInputError('UNSUPPORTED_PLATFORM', 'Secure filesystem access requires Linux or macOS with Python 3.10 or later.');
 if (typeof root !== 'string' || root.length > 8192 || root.includes('\0')) throw new SafeInputError('UNSAFE_PATH', 'Invalid workspace root.');
 const input = JSON.stringify({ ...request, root: path.resolve(root) });
 if (Buffer.byteLength(input) > 8 * 1024 * 1024) throw new SafeInputError('SIZE', 'Input exceeds maximum size.');
 if (active >= 4) { if (pending.length >= 128) throw new SafeInputError('BUSY', 'Secure filesystem request limit reached.'); await new Promise<void>(resolve => pending.push(resolve)); }
 active++;
 try {
  if (signal?.aborted) throw new SafeInputError('CANCELLED', 'Operation cancelled.');
  return await new Promise((resolve, reject) => {
   const child = spawn('python3', ['-I', '-S', '-c', HELPER], { cwd: '/', env: { PATH: process.env.PATH ?? '/usr/bin:/bin' }, stdio: ['pipe', 'pipe', 'ignore'], detached: true });
   let bytes = 0; const chunks: Buffer[] = []; let failure: string | undefined;
   const stop = (code: string) => { failure = code; try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } };
   const timer = setTimeout(() => stop('TIMEOUT'), timeoutMs);
   const cancel = () => stop('CANCELLED'); signal?.addEventListener('abort', cancel, { once: true });
   child.stdout.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > 24 * 1024 * 1024) stop('SIZE'); else chunks.push(chunk); });
   child.stdin.on('error', () => {});
   child.on('error', () => { failure = 'PYTHON_REQUIRED'; });
   child.on('close', code => {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel);
    try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch { /* group is already gone */ }
    try {
     if (failure || code !== 0) throw new Error(failure ?? 'FILE_ACCESS');
     const result = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { ok: boolean; code?: string; value?: unknown };
     if (!result.ok) throw new Error(result.code ?? 'FILE_ACCESS');
     resolve(result.value);
    } catch (error) {
     const known = ['PYTHON_REQUIRED','UNSUPPORTED_RUNTIME','UNSAFE_PATH','FILE_MISSING','FILE_EXISTS','SYMLINK','FILE_TYPE','SIZE','TIMEOUT','CANCELLED','GIT_FAILED','FILE_ACCESS'];
     const code = error instanceof Error && known.includes(error.message) ? error.message : 'FILE_ACCESS';
     reject(new SafeInputError(code, code === 'PYTHON_REQUIRED' ? 'Secure filesystem access requires Python 3.10 or later on PATH.' : `Secure filesystem operation rejected (${code}).`));
    }
   });
   child.stdin.end(input);
  });
 } finally { active--; pending.shift()?.(); }
}

export async function anchoredReadFile(root: string, relativePath: string, maxBytes = MAX_INPUT_BYTES): Promise<Buffer> {
 checkLimit(maxBytes); assertSafeRelativePath(relativePath);
 return Buffer.from(await run(root, { op: 'read', path: relativePath, limit: maxBytes }) as string, 'base64');
}
/** Creates new files exclusively. Existing files are never replaced. A failed
 * batch may leave empty newly-created files, never partially overwrite data. */
export async function safeWriteFiles(root: string, files: Array<{path: string; content: string | Buffer}>, options: {createParents?: boolean} = {}): Promise<void> {
 if (!Array.isArray(files) || !files.length || files.length > 64) throw new SafeInputError('SIZE', 'Unsupported output file count.');
 let total = 0;
 const encoded = files.map(file => { assertSafeRelativePath(file.path); const data = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content); total += data.length; return { path: file.path, data: data.toString('base64') }; });
 if (total > MAX_INPUT_BYTES) throw new SafeInputError('SIZE', 'Output exceeds maximum size.');
 await run(root, { op: 'write', files: encoded, createParents: options.createParents === true });
}
export interface SafeDirectoryEntry { name: string; kind: 'directory' | 'file' | 'symlink' | 'other' }
export async function safeListDirectory(root: string, relativePath = '', limit = 20000): Promise<{entries: SafeDirectoryEntry[]; truncated: boolean}> {
 if (relativePath) assertSafeRelativePath(relativePath);
 if (!Number.isSafeInteger(limit) || limit < 1 || limit > 80000) throw new SafeInputError('SIZE', 'Invalid directory entry limit.');
 return await run(root, { op: 'list', path: relativePath, limit }) as {entries: SafeDirectoryEntry[]; truncated: boolean};
}
/** Append only to an existing, singly-linked regular runner-owned file. */
export async function safeAppendFile(root: string, relativePath: string, text: string): Promise<void> {
 assertSafeRelativePath(relativePath); const data = Buffer.from(text);
 if (data.length > MAX_INPUT_BYTES) throw new SafeInputError('SIZE', 'Output exceeds maximum size.');
 await run(root, { op: 'append', path: relativePath, data: data.toString('base64') });
}
export async function safeGit(root: string, args: string[], maxBytes = 16 * 1024 * 1024): Promise<string> {
 const flags = new Set(['--verify','--end-of-options','--show-toplevel','--no-ext-diff','--no-textconv','--unified=0','--find-renames','--','--others','--exclude-standard','-z','--porcelain','--untracked-files=normal']);
 if (!['rev-parse','diff','ls-files','status'].includes(args[0] ?? '') || args.length > 20 || args.slice(1).some(arg => typeof arg !== 'string' || arg.length > 300 || (!flags.has(arg) && !/^[A-Za-z0-9_][A-Za-z0-9_./~^{}-]*$/.test(arg))) || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 16 * 1024 * 1024) throw new SafeInputError('GIT_FAILED', 'Unsupported Git operation.');
 return Buffer.from(await run(root, { op: 'git', args, limit: maxBytes }) as string, 'base64').toString('utf8');
}
/** Explicitly trusted command execution. This controls cwd and log capture;
 * it is not a sandbox for the command itself. */
export async function runTrustedCommand(root: string, args: string[], options: {allowExecution: true; timeoutMs: number; signal?: AbortSignal}): Promise<number> {
 if (options.allowExecution !== true || !Array.isArray(args) || !args.length || args.length > 100 || args.some(arg => typeof arg !== 'string' || arg.length > 4096 || arg.includes('\0')) || !Number.isInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 300000) throw new SafeInputError('UNSAFE_PATH', 'Invalid trusted command.');
 return await run(root, { op: 'execute', args, timeoutMs: options.timeoutMs }, options.timeoutMs + 1000, options.signal) as number;
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

const local = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const target = new URL(local.DATABASE_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev');
assert(local.VOCABFLOW_ENV === 'development' && local.DATABASE_ENV === 'development'
  && local.EXECUTION_CONTEXT === 'local-development' && local.DATABASE_DRIVER === 'postgres-js' && !local.VERCEL_ENV);
const env = {};
for (const key of ['PATH','Path','SystemRoot','windir','ComSpec','PATHEXT','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, local);
const children = [
  ['--import','tsx','apps/api/src/local-dev.ts'],
  ['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.mts','--host','127.0.0.1','--port','5173','--strictPort']
].map(args => spawn(process.execPath, args, { env, stdio: ['ignore','pipe','pipe'], windowsHide: true }));
for (const child of children) {
  for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => process.stdout.write(bytes.toString().replace(/postgres(?:ql)?:\/\/[^\s"']+/gu, '[REDACTED_DB_URL]')));
  child.on('exit', code => { if (code) { for (const sibling of children) sibling.kill(); process.exitCode = code; } });
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { for (const child of children) child.kill(); });

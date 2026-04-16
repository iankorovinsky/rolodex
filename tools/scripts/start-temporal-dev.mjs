#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const temporalDir = path.join(repoRoot, 'infra', 'temporal');
const dbFilename = path.join(temporalDir, 'dev.db');
const grpcPort = 7233;
const uiPort = 8233;

await mkdir(temporalDir, { recursive: true });

const child = spawn(
  'temporal',
  [
    'server',
    'start-dev',
    '--ip',
    'localhost',
    '--port',
    String(grpcPort),
    '--ui-ip',
    'localhost',
    '--ui-port',
    String(uiPort),
    '--db-filename',
    dbFilename,
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      TEMPORAL_ADDRESS: `localhost:${grpcPort}`,
      TEMPORAL_UI_ADDRESS: `http://localhost:${uiPort}`,
    },
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

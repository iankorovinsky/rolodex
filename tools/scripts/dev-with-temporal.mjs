#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const temporal = spawn(process.execPath, [path.join(__dirname, 'start-temporal-dev.mjs')], {
  cwd: repoRoot,
  stdio: 'ignore',
  env: process.env,
});

const worker = spawn('bun', ['run', '--filter', '@rolodex/jobs', 'dev'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

const appDev = spawn(
  'bun',
  [
    'x',
    'turbo',
    'run',
    'dev',
    '--ui=tui',
    '--parallel',
    '--filter=@rolodex/desktop',
    '--filter=@rolodex/api',
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  }
);

let shuttingDown = false;

const killTemporal = (signal = 'SIGTERM') => {
  if (!temporal.killed) {
    temporal.kill(signal);
  }
};

const shutdown = (signal = 'SIGTERM') => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!appDev.killed) {
    appDev.kill(signal);
  }

  if (!worker.killed) {
    worker.kill(signal);
  }

  killTemporal(signal);

  setTimeout(() => {
    killTemporal('SIGKILL');
  }, 1_000).unref();
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

temporal.on('exit', (code) => {
  if (!shuttingDown && code && code !== 0) {
    console.error(`Temporal dev server exited with code ${code}.`);
    shutdown();
  }
});

worker.on('exit', (code) => {
  if (!shuttingDown && code && code !== 0) {
    console.error(`Temporal worker exited with code ${code}.`);
    shutdown();
  }
});

appDev.on('exit', (code, signal) => {
  shutdown(signal ?? 'SIGTERM');

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

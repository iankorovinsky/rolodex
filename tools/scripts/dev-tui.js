#!/usr/bin/env node

const { spawn } = require('child_process');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chokidar = require('chokidar');
const path = require('path');

// Load root .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Rolodex Dev',
  fullUnicode: true,
});

// Create grid layout
const grid = new contrib.grid({
  rows: 1,
  cols: 12,
  screen: screen,
});

// Left sidebar - process list (2 columns wide)
const sidebar = grid.set(0, 0, 1, 2, blessed.list, {
  label: ' Processes ',
  keys: true,
  vi: true,
  mouse: true,
  style: {
    selected: {
      bg: 'blue',
      fg: 'white',
      bold: true,
    },
    item: {
      fg: 'white',
    },
  },
  items: ['desktop', 'api', 'trigger', 'db'],
});

// Right side - log output area (10 columns wide)
const desktopLog = grid.set(0, 2, 1, 10, contrib.log, {
  label: ' desktop ',
  fg: 'cyan',
  selectedFg: 'cyan',
  style: {
    border: {
      fg: 'cyan',
    },
  },
});

const apiLog = grid.set(0, 2, 1, 10, contrib.log, {
  label: ' api ',
  fg: 'magenta',
  selectedFg: 'magenta',
  style: {
    border: {
      fg: 'magenta',
    },
  },
});

const triggerLog = grid.set(0, 2, 1, 10, contrib.log, {
  label: ' trigger ',
  fg: 'yellow',
  selectedFg: 'yellow',
  style: {
    border: {
      fg: 'yellow',
    },
  },
});

const dbLog = grid.set(0, 2, 1, 10, contrib.log, {
  label: ' db ',
  fg: 'green',
  selectedFg: 'green',
  style: {
    border: {
      fg: 'green',
    },
  },
});

let currentView = 'desktop';
const logs = { desktop: desktopLog, api: apiLog, trigger: triggerLog, db: dbLog };

// Show desktop by default
desktopLog.show();
apiLog.hide();
triggerLog.hide();
dbLog.hide();

// Color helper function
const colorize = (text, color) => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
};

// Spawn processes with inherited env
const spawnOpts = { stdio: 'pipe', env: { ...process.env } };
const processes = {
  desktop: spawn('bun', ['dev'], { ...spawnOpts, cwd: 'apps/desktop' }),
  api: spawn('bun', ['dev'], { ...spawnOpts, cwd: 'apps/api' }),
  trigger: spawn('bunx', ['trigger.dev@4.3.3', 'dev'], spawnOpts),
  db: spawn('bun', ['run', 'generate'], { ...spawnOpts, cwd: 'packages/db' }),
};

// Handle process errors
Object.entries(processes).forEach(([name, proc]) => {
  proc.on('error', (err) => {
    logs[name].log(colorize(`Error starting ${name}: ${err.message}`, 'red'));
  });

  proc.on('exit', (code) => {
    logs[name].log(colorize(`Process ${name} exited with code ${code}`, 'yellow'));
  });
});

// Pipe output to logs
processes.desktop.stdout.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => desktopLog.log(line));
});

processes.desktop.stderr.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => desktopLog.log(colorize(line, 'red')));
});

processes.api.stdout.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => apiLog.log(line));
});

processes.api.stderr.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => apiLog.log(colorize(line, 'red')));
});

processes.trigger.stdout.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => triggerLog.log(line));
});

processes.trigger.stderr.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => triggerLog.log(colorize(line, 'red')));
});

processes.db.stdout.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => dbLog.log(line));
});

processes.db.stderr.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((line) => line.trim());
  lines.forEach((line) => dbLog.log(colorize(line, 'red')));
});

// Watch for schema changes and regenerate db
const schemaWatcher = chokidar.watch('packages/db/prisma/schema/**/*.prisma', {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true,
});

schemaWatcher.on('change', (filePath) => {
  dbLog.log(colorize(`Schema changed: ${path.basename(filePath)}`, 'yellow'));
  dbLog.log(colorize('Regenerating Prisma client...', 'yellow'));

  // Kill existing process
  if (processes.db && !processes.db.killed) {
    processes.db.kill();
  }

  // Spawn new generate process
  processes.db = spawn('bun', ['run', 'generate'], { cwd: 'packages/db', stdio: 'pipe' });

  processes.db.stdout.on('data', (data) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim());
    lines.forEach((line) => dbLog.log(line));
  });

  processes.db.stderr.on('data', (data) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim());
    lines.forEach((line) => dbLog.log(colorize(line, 'red')));
  });

  processes.db.on('exit', (code) => {
    if (code === 0) {
      dbLog.log(colorize('✓ Prisma client regenerated successfully', 'green'));
    } else {
      dbLog.log(colorize(`✗ Prisma client generation failed with code ${code}`, 'red'));
    }
  });
});

// Function to switch view
const switchView = (selected) => {
  if (selected !== currentView && logs[selected]) {
    currentView = selected;

    // Hide all logs
    Object.values(logs).forEach((log) => log.hide());

    // Show selected log
    logs[currentView].show();
    screen.render();
  }
};

// Handle sidebar selection (for Enter key)
sidebar.on('select', (item) => {
  const selected = sidebar.getItem(item).content.trim().toLowerCase();
  switchView(selected);
});

// Auto-switch on arrow key navigation
const items = ['web', 'api', 'trigger', 'db'];

// Wrap the list's move methods to auto-switch
const originalUp = sidebar.up.bind(sidebar);
const originalDown = sidebar.down.bind(sidebar);

sidebar.up = function () {
  const oldIndex = this.selected;
  originalUp();
  if (this.selected !== oldIndex) {
    switchView(items[this.selected]);
  }
};

sidebar.down = function () {
  const oldIndex = this.selected;
  originalDown();
  if (this.selected !== oldIndex) {
    switchView(items[this.selected]);
  }
};

// Focus sidebar for navigation
sidebar.focus();

// Quit handler
const quit = () => {
  // Kill all processes
  Object.values(processes).forEach((proc) => {
    proc.kill('SIGTERM');
  });
  setTimeout(() => {
    Object.values(processes).forEach((proc) => {
      proc.kill('SIGKILL');
    });
    process.exit(0);
  }, 1000);
};

screen.key(['q', 'C-c'], quit);

// Initial selection
sidebar.select(0);
screen.render();

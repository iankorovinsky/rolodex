#!/usr/bin/env node

const { spawn } = require('child_process');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chokidar = require('chokidar');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const PROCESS_NAMES = ['desktop', 'storybook', 'api', 'temporal', 'worker', 'db'];
const PROCESS_COLORS = {
  desktop: 'cyan',
  storybook: 'white',
  api: 'magenta',
  temporal: 'yellow',
  worker: 'blue',
  db: 'green',
};
const MAX_LOG_LINES = 2000;
const WHEEL_SCROLL_DELTA = 1;
const PAGE_SCROLL_DELTA = 15;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Rolodex custom dev TUI

Usage:
  bun run dev
  bun run dev -- --help

Controls:
  Up / Down       Switch selected process
  1-6             Jump directly to desktop/storybook/api/temporal/worker/db
  Mouse click     Switch process
  Mouse wheel     Scroll logs
  Page Up/Down    Scroll logs faster
  s               Toggle selection mode
  Esc             Exit selection mode
  q / Ctrl-C      Quit

Notes:
  Selection mode disables terminal mouse capture so text can be selected normally.
  While selection mode is enabled, mouse clicks are handled by the terminal rather than the TUI.
`);
  process.exit(0);
}

const screen = blessed.screen({
  smartCSR: true,
  title: 'Rolodex Dev',
  fullUnicode: true,
});

const grid = new contrib.grid({
  rows: 11,
  cols: 12,
  screen,
});

const sidebar = grid.set(0, 0, 11, 2, blessed.list, {
  label: ' Processes ',
  keys: true,
  vi: true,
  mouse: true,
  clickable: true,
  style: {
    selected: {
      bg: 'blue',
      fg: 'white',
      bold: true,
    },
    item: {
      fg: 'white',
    },
    border: {
      fg: 'blue',
    },
  },
  items: PROCESS_NAMES,
});

const logPane = grid.set(0, 2, 11, 10, blessed.box, {
  label: ' desktop ',
  tags: false,
  keys: true,
  vi: true,
  mouse: true,
  clickable: true,
  scrollable: true,
  alwaysScroll: true,
  wrap: true,
  border: 'line',
  scrollbar: {
    ch: ' ',
    inverse: true,
  },
  style: {
    fg: 'white',
    border: {
      fg: PROCESS_COLORS.desktop,
    },
    scrollbar: {
      bg: 'white',
    },
  },
});

let currentView = PROCESS_NAMES[0];
let selectionMode = false;
const logBuffers = Object.fromEntries(PROCESS_NAMES.map((name) => [name, []]));
const scrollOffsets = Object.fromEntries(PROCESS_NAMES.map((name) => [name, 0]));

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

const updateChrome = () => {
  const sidebarHalo = selectionMode ? 'gray' : 'green';
  const logHalo = selectionMode ? 'green' : 'gray';

  sidebar.style.border.fg = sidebarHalo;
  sidebar.style.selected.bg = selectionMode ? 'green' : 'blue';
  logPane.style.border.fg = logHalo;
  logPane.style.scrollbar.bg = logHalo;
};

const saveScroll = () => {
  scrollOffsets[currentView] = logPane.getScroll();
};

const renderCurrentView = ({ stickToBottom = false } = {}) => {
  const lines = logBuffers[currentView];
  logPane.setLabel(` ${currentView} `);
  logPane.setContent(lines.join('\n'));

  if (stickToBottom) {
    logPane.setScroll(lines.length);
    scrollOffsets[currentView] = logPane.getScroll();
  } else {
    logPane.setScroll(scrollOffsets[currentView] ?? 0);
  }

  screen.render();
};

const appendLogLine = (name, line) => {
  if (!line.trim()) {
    return;
  }

  const wasPinnedToBottom = name === currentView ? logPane.getScrollPerc() >= 99 : false;

  const buffer = logBuffers[name];
  buffer.push(line);

  if (buffer.length > MAX_LOG_LINES) {
    buffer.splice(0, buffer.length - MAX_LOG_LINES);
    if (name !== currentView) {
      scrollOffsets[name] = Math.max(0, scrollOffsets[name] - 1);
    }
  }

  if (name === currentView) {
    renderCurrentView({ stickToBottom: wasPinnedToBottom });
  }
};

const pipeProcessOutput = (name, proc) => {
  proc.stdout.on('data', (data) => {
    data
      .toString()
      .split('\n')
      .forEach((line) => appendLogLine(name, line));
  });

  proc.stderr.on('data', (data) => {
    data
      .toString()
      .split('\n')
      .forEach((line) => appendLogLine(name, colorize(line, 'red')));
  });

  proc.on('error', (err) => {
    appendLogLine(name, colorize(`Error starting ${name}: ${err.message}`, 'red'));
  });

  proc.on('exit', (code) => {
    appendLogLine(name, colorize(`Process ${name} exited with code ${code}`, 'yellow'));
  });
};

const spawnOpts = { stdio: 'pipe', env: { ...process.env } };

const requirePort = (value, name) => {
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env (example: "${name}=localhost:7233")`);
  }

  const match = String(value).match(/:(\d+)/);
  if (!match) {
    throw new Error(
      `Invalid ${name}="${value}". Expected host:port (example: "localhost:7233" or "http://localhost:7233").`
    );
  }

  const port = Number(match[1]);
  if (!Number.isFinite(port)) {
    throw new Error(`Invalid ${name} port in "${value}".`);
  }
  return port;
};

const temporalServerUrl = spawnOpts.env.TEMPORAL_SERVER_URL;
const temporalUiUrl = spawnOpts.env.TEMPORAL_UI_URL;

const TEMPORAL_GRPC_PORT = requirePort(temporalServerUrl, 'TEMPORAL_SERVER_URL');
const TEMPORAL_UI_PORT = requirePort(temporalUiUrl, 'TEMPORAL_UI_URL');
const TEMPORAL_DB_FILENAME = path.resolve(__dirname, '../../infra/temporal/dev.db');

const processes = {
  desktop: spawn('bun', ['run', 'dev'], { ...spawnOpts, cwd: 'apps/desktop' }),
  storybook: spawn('bun', ['run', 'storybook'], { ...spawnOpts, cwd: 'apps/desktop' }),
  api: spawn('bun', ['run', 'dev'], { ...spawnOpts, cwd: 'apps/api' }),
  temporal: spawn(
    'temporal',
    [
      'server',
      'start-dev',
      '--ip',
      'localhost',
      '--port',
      String(TEMPORAL_GRPC_PORT),
      '--ui-ip',
      'localhost',
      '--ui-port',
      String(TEMPORAL_UI_PORT),
      '--db-filename',
      TEMPORAL_DB_FILENAME,
    ],
    {
      ...spawnOpts,
      env: {
        ...spawnOpts.env,
        TEMPORAL_SERVER_URL: `localhost:${TEMPORAL_GRPC_PORT}`,
        TEMPORAL_UI_URL: `http://localhost:${TEMPORAL_UI_PORT}`,
      },
    }
  ),
  worker: spawn('bun', ['run', '--filter', '@rolodex/jobs', 'dev'], spawnOpts),
  db: spawn('bun', ['run', 'generate'], { ...spawnOpts, cwd: 'packages/db' }),
};

Object.entries(processes).forEach(([name, proc]) => {
  pipeProcessOutput(name, proc);
});

const switchView = (selected) => {
  if (!PROCESS_NAMES.includes(selected) || selected === currentView) {
    return;
  }

  saveScroll();
  currentView = selected;
  sidebar.select(PROCESS_NAMES.indexOf(selected));
  renderCurrentView();
};

const ensureMouseMode = () => {
  if (!selectionMode) {
    return;
  }

  selectionMode = false;
  screen.program.enableMouse();
  updateChrome();
};

const activateView = (selected) => {
  switchView(selected);
  sidebar.focus();
  screen.render();
};

sidebar.on('select', (item) => {
  const selected = item.getText().trim().toLowerCase();
  switchView(selected);
});

sidebar.items.forEach((item, index) => {
  item.on('click', () => {
    activateView(PROCESS_NAMES[index]);
  });
});

sidebar.key(['up', 'down'], () => {
  setImmediate(() => {
    const selected = PROCESS_NAMES[sidebar.selected] ?? currentView;
    switchView(selected);
  });
});

logPane.key(['pageup'], () => {
  logPane.scroll(-PAGE_SCROLL_DELTA);
  saveScroll();
  screen.render();
});

logPane.key(['pagedown'], () => {
  logPane.scroll(PAGE_SCROLL_DELTA);
  saveScroll();
  screen.render();
});

logPane.on('wheelup', () => {
  logPane.scroll(-WHEEL_SCROLL_DELTA);
  saveScroll();
  screen.render();
});

logPane.on('wheeldown', () => {
  logPane.scroll(WHEEL_SCROLL_DELTA);
  saveScroll();
  screen.render();
});

const toggleSelectionMode = () => {
  selectionMode = !selectionMode;

  if (selectionMode) {
    screen.program.disableMouse();
  } else {
    screen.program.enableMouse();
  }

  updateChrome();
  screen.render();
};

screen.key(['s'], toggleSelectionMode);
screen.key(['escape'], () => {
  ensureMouseMode();
  screen.render();
});
screen.key(['1', '2', '3', '4', '5', '6'], (_, key) => {
  const index = Number(key.full) - 1;
  const selected = PROCESS_NAMES[index];

  if (!selected) {
    return;
  }

  activateView(selected);
});

const schemaWatcher = chokidar.watch('packages/db/prisma/schema/**/*.prisma', {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true,
});

schemaWatcher.on('change', (filePath) => {
  appendLogLine('db', colorize(`Schema changed: ${path.basename(filePath)}`, 'yellow'));
  appendLogLine('db', colorize('Regenerating Prisma client...', 'yellow'));

  if (processes.db && !processes.db.killed) {
    processes.db.kill();
  }

  processes.db = spawn('bun', ['run', 'generate'], {
    ...spawnOpts,
    cwd: 'packages/db',
  });

  pipeProcessOutput('db', processes.db);
});

const quit = () => {
  schemaWatcher.close().catch(() => {});

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

sidebar.focus();
sidebar.select(0);
updateChrome();
renderCurrentView({ stickToBottom: true });

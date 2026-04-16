import js from '@eslint/js';
import tsparser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {string[]} */
const SHARED_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/dist-electron/**',
  '**/build/**',
  '**/.turbo/**',
  '**/generated/**',
  '**/storybook-static/**',
  'types/**',
  'app/**',
  'next-env.d.ts',
];

const NODE_GLOBALS = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  global: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  mock: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  /** Bun / modern runtime fetch surface */
  fetch: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Headers: 'readonly',
  AbortController: 'readonly',
};

const BROWSER_GLOBALS = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  FormData: 'readonly',
  File: 'readonly',
  Blob: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  Notification: 'readonly',
  IntersectionObserver: 'readonly',
  ResizeObserver: 'readonly',
  MutationObserver: 'readonly',
  MediaQueryListEvent: 'readonly',
  NodeJS: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
};

/**
 * Express API: Node + TypeScript + Prettier (last).
 * @returns {import('eslint').Linter.Config[]}
 */
export function createApiEslintConfig() {
  return [
    { ignores: SHARED_IGNORES },
    js.configs.recommended,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: tsparser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
        },
        globals: NODE_GLOBALS,
      },
      plugins: {
        '@typescript-eslint': tseslint,
      },
      rules: {
        ...tseslint.configs.recommended.rules,
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    eslintConfigPrettier,
  ];
}

/** Desktop: browser + TS/TSX + React hooks/refresh + Storybook + Prettier (last). */
export function createDesktopEslintConfig({ reactRefresh, reactHooksRecommended, storybookFlatRecommended }) {
  return [
    { ignores: SHARED_IGNORES },
    js.configs.recommended,
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tsparser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true,
          },
        },
        globals: BROWSER_GLOBALS,
      },
      plugins: {
        'react-refresh': reactRefresh,
        '@typescript-eslint': tseslint,
      },
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    reactHooksRecommended,
    ...storybookFlatRecommended,
    eslintConfigPrettier,
  ];
}

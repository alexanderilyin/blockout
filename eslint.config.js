// Linting for every app and package (npm run lint runs it through Turborepo).
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', 'data/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Node: the server, tests and build configs
    files: ['apps/server/**/*.js', '**/test/**/*.js', '**/vite.config.js', 'packages/ui/src/vite-plugin.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];

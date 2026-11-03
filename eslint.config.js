// @ts-check
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Layered, feature-first architecture (docs/plan-implementacion.md, section 5.2).
 * Dependencies only point downwards:
 *
 *   app ─> feature public API (index.ts) ─> components ─> hooks ─> api ─> domain
 *                                                  shared/ui   shared/hooks   shared/api   shared/domain
 *
 * Inside a feature, layers may only reach their OWN feature's internals. Other
 * features are reachable only through their public `index.ts` ("feature-public"),
 * and only from components and hooks.
 */
const sameFeature = { feature: '{{ from.element.captured.feature }}' };

/** @param {string} type */
const own = (type) => ({ to: { element: { type, captured: sameFeature } } });
/** @param {string[]} types */
const anyOf = (types) => ({ to: { element: { types } } });

const SHARED_FOR_UI = ['shared-ui', 'shared-hooks', 'shared-domain', 'shared-styles'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'web/src/shared/api/database.types.ts',
      'docs/**',
      'supabase/**',
      '.claude/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'web/vite.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'smart'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Node-side files: configs, scripts, shared fixtures, workers.
  {
    files: ['*.{js,ts}', 'scripts/**', 'shared/**', 'web/vite.config.ts', 'workers/**', 'e2e/**'],
    languageOptions: { globals: globals.node },
  },

  // Browser app.
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      'import/resolver': {
        typescript: { project: 'web/tsconfig.json' },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'web/src/app', partialMatch: false },
        {
          type: 'feature-components',
          pattern: 'web/src/features/*/components',
          capture: ['feature'],
          partialMatch: false,
        },
        {
          type: 'feature-hooks',
          pattern: 'web/src/features/*/hooks',
          capture: ['feature'],
          partialMatch: false,
        },
        {
          type: 'feature-api',
          pattern: 'web/src/features/*/api',
          capture: ['feature'],
          partialMatch: false,
        },
        {
          type: 'feature-domain',
          pattern: 'web/src/features/*/domain',
          capture: ['feature'],
          partialMatch: false,
        },
        // Files at the feature root: index.ts (public API) and messages.es.ts (UI copy).
        {
          type: 'feature-public',
          pattern: 'web/src/features/*',
          capture: ['feature'],
          partialMatch: false,
        },
        { type: 'shared-ui', pattern: 'web/src/shared/ui', partialMatch: false },
        { type: 'shared-hooks', pattern: 'web/src/shared/hooks', partialMatch: false },
        { type: 'shared-api', pattern: 'web/src/shared/api', partialMatch: false },
        { type: 'shared-domain', pattern: 'web/src/shared/domain', partialMatch: false },
        { type: 'shared-styles', pattern: 'web/src/shared/styles', partialMatch: false },
        { type: 'fixtures', pattern: 'shared/fixtures', partialMatch: false },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'Layer rule: "{{ from.element.types.[0] }}" may not import "{{ to.element.types.[0] }}". See docs/plan-implementacion.md section 5.2.',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: anyOf([
                'app',
                'feature-public',
                'shared-ui',
                'shared-hooks',
                'shared-api',
                'shared-styles',
              ]),
            },
            {
              from: { element: { type: 'feature-public' } },
              allow: [
                own('feature-public'),
                own('feature-components'),
                own('feature-hooks'),
                own('feature-domain'),
              ],
            },
            {
              from: { element: { type: 'feature-components' } },
              allow: [
                own('feature-components'),
                own('feature-hooks'),
                own('feature-domain'),
                anyOf(['feature-public', ...SHARED_FOR_UI]),
              ],
            },
            {
              from: { element: { type: 'feature-hooks' } },
              allow: [
                own('feature-hooks'),
                own('feature-api'),
                own('feature-domain'),
                anyOf(['feature-public', 'shared-hooks', 'shared-api', 'shared-domain']),
              ],
            },
            {
              from: { element: { type: 'feature-api' } },
              allow: [
                own('feature-api'),
                own('feature-domain'),
                anyOf(['shared-api', 'shared-domain']),
              ],
            },
            {
              from: { element: { type: 'feature-domain' } },
              allow: [own('feature-domain'), anyOf(['shared-domain', 'fixtures'])],
            },
            {
              from: { element: { type: 'shared-ui' } },
              allow: anyOf(['shared-ui', 'shared-domain', 'shared-styles']),
            },
            {
              from: { element: { type: 'shared-hooks' } },
              allow: anyOf(['shared-hooks', 'shared-api', 'shared-domain']),
            },
            {
              from: { element: { type: 'shared-api' } },
              allow: anyOf(['shared-api', 'shared-domain']),
            },
            {
              from: { element: { type: 'shared-domain' } },
              allow: anyOf(['shared-domain', 'fixtures']),
            },
          ],
        },
      ],

      // Only the gateway (shared/api) may talk to Supabase.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Only web/src/shared/api may import supabase-js (gateway layer).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['web/src/shared/api/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
);

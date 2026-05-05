import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/*.js', '**/*.mjs', '**/*.d.ts'],
  },

  // airbnb-base と import プラグイン設定をレガシー互換レイヤー経由で読み込み
  ...compat.extends('airbnb-base'),
  ...compat.extends(
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ),

  // Google Apps Script グローバル変数の定義
  ...compat.config({
    plugins: ['googleappsscript'],
    env: {
      'googleappsscript/googleappsscript': true,
    },
  }),

  // TypeScript ファイル設定
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2019,
        sourceType: 'module',
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        Todoist: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'function', modifiers: ['global'], format: ['camelCase'], trailingUnderscore: 'allow' },
        { selector: 'classProperty', modifiers: ['static', 'readonly'], format: ['UPPER_CASE'] },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      camelcase: 'off',
      'import/extensions': ['error', 'ignorePackages', { ts: 'never', js: 'never' }],
      'import/prefer-default-export': 'off',
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-underscore-dangle': 'off',
      'no-unused-vars': 'off',
      'object-curly-newline': ['error', { multiline: true, consistent: true }],
    },
  },

  // Jest テストファイル設定
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: jestPlugin.environments.globals.globals,
    },
  },
];
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  ignorePatterns: ['dist', 'node_modules', '*.js', 'coverage'],
  rules: {
    'import/prefer-default-export': 'off',
    // Path alias @/* (tsc-alias): avoid airbnb extension rule on TS imports
    'import/extensions': 'off',
    'no-console': 'off',
  },
};

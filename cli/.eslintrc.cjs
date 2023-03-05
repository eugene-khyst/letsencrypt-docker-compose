module.exports = {
  env: {
    browser: false,
    node: true,
    commonjs: false,
    es2021: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-console': 'off',
    'import/extensions': 'off',
  },
};

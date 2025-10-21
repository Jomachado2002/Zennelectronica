module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Suppress warnings for production builds
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/img-redundant-alt': 'warn',
    'no-use-before-define': 'warn',
    'import/no-anonymous-default-export': 'warn'
  },
  env: {
    browser: true,
    es6: true,
    node: true
  }
};

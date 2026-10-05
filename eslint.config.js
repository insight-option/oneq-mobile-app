// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'amplify/**/node_modules/*', 'node_modules/*'],
  },
  {
    rules: {
      'react-native/no-inline-styles': 'off',
      'import/no-unresolved': 'off',
      // Reanimated shared values are mutated by design (`sv.value = x`); the compiler lint flags them as immutable hook results.
      'react-hooks/immutability': 'off',
    },
  },
]);

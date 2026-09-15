import base from '@yearwise/config/eslint.base.mjs';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * The shared baseline plus React hook rules.
 *
 * The screens are hooks-heavy - a stale closure in a dependency array is the
 * defect class that is hardest to see in review, and the one most likely to
 * show a stale balance.
 */
export default [
  ...base,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

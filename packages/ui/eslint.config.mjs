import base from '@yearwise/config/eslint.base.mjs';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * The shared baseline plus React hook rules.
 *
 * Hooks are the whole of this package's behaviour, and a stale closure in a
 * dependency array is the defect class that is hardest to see in review.
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

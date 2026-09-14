import base from '@yearwise/config/eslint.base.mjs';

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    rules: {
      // docs/03-features/feat-fin-03-transaction-ledger.md acceptance criteria:
      // no floating-point parsing or rounding anywhere near money.
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Money is parsed by parseMoney, never by JS float parsing.' },
        { name: 'parseInt', message: 'Money is parsed by parseMoney, never by JS float parsing.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          property: 'toFixed',
          message: 'toFixed rounds via IEEE-754. Format through formatMoney instead.',
        },
        {
          property: 'toPrecision',
          message: 'toPrecision rounds via IEEE-754. Format through formatMoney instead.',
        },
      ],
    },
  },
];
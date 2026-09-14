import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint flat config.
 *
 * Deliberately small. It enforces the rules that matter to this product:
 * type imports, no `any`, and no floating-point arithmetic on money.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/^[*/%]$/][left.type!='Literal'] > Literal[value=/^1[0-9]*$/][raw=/[0-9]+\\.[0-9]+/]",
          message:
            'Floating-point literals must not be used in arithmetic. Money is bigint minor units - see docs/00-product/decisions.md A1.',
        },
      ],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**'],
  },
);
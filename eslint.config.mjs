// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';

// Root ESLint config: apply basic rules repo-wide.
// Subprojects can override with their own flat configs.
export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'quizmaster-api/node_modules/**',
      'quizmaster-api/dist/**',
      'quizmaster-api/coverage/**',
      'quizmaster-api/prisma/generated/**',
      'quizmaster-api/prisma/migrations/**',
      'quizmaster-ui/node_modules/**',
      'quizmaster-ui/.next/**'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...eslint.configs.recommended.rules,
    },
  },
  // Frontend: general browser globals and module source type
  {
    files: ['quizmaster-ui/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      sourceType: 'module',
    },
    rules: {},
  },
];

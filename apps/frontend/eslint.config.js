import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  { ignores: ['dist', 'node_modules'] },

  js.configs.recommended,

  /* Node ortamı: vite.config.ts ve diğer kök config dosyaları */
  {
    files: ['*.config.{ts,js,cjs}', '*.config.*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  /* Uygulama kaynak dosyaları */
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      /* Temel TypeScript kuralları */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      /* const + type aynı isim: geçerli TypeScript pattern — tsc zaten kontrol eder */
      'no-redeclare': 'off',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  /* 50+ kutu kuralı: planning sahne dosyalarında doğrudan <mesh> JSX yasak.
     BoxWrapper (<50 kutu) veya CargoMeshInstanced (≥50 kutu) kullanılır. */
  {
    files: ['src/features/planning/scene/**/*.{ts,tsx}'],
    /* Kuralın işaret ettiği primitifin kendisi ve sahne dekoru muaftır:
       BoxWrapper zaten kutu çizmenin yetkili yolu, LandingWireframe ise
       kutu değil tel kafes çiziyor. */
    ignores: [
      'src/features/planning/scene/components/BoxWrapper.tsx',
      'src/features/planning/scene/components/LandingWireframe.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='mesh']",
          message:
            'Sahne dosyalarında doğrudan <mesh> kullanılmaz. <50 kutu için BoxWrapper, ≥50 kutu için CargoMeshInstanced kullanın.',
        },
      ],
    },
  },

  prettierConfig,
];

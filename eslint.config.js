import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Jawny typ zwracany obowiązkowy dla każdej nazwanej funkcji.
      // Wyjątki na inline callbacki (map/filter/onClick/...) — inaczej
      // każdy JSX handler wymagałby `: void` i config byłby nie do zniesienia.
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      // Granice vertical-slice: features nie importują z innych features,
      // shared nie importuje z features (patrz context/foundation/vertical-slices-plan.md §6).
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/features/auth', from: './src/features', except: ['./auth'] },
            { target: './src/features/company', from: './src/features', except: ['./company'] },
            { target: './src/features/profile', from: './src/features', except: ['./profile'] },
            { target: './src/features/favorites', from: './src/features', except: ['./favorites'] },
            { target: './src/features/chat', from: './src/features', except: ['./chat'] },
            { target: './src/features/admin', from: './src/features', except: ['./admin'] },
            { target: './src/shared', from: './src/features' },
          ],
        },
      ],
    },
  },
])

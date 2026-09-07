import next from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['.next/**', '.artifacts/**', 'node_modules/**', 'next-env.d.ts'] },
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // SPEC §1: core has four entry points; nothing else may be imported.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@studio/core/*', '!@studio/core/admin', '!@studio/core/schema', '!@studio/core/migrations', '!@studio/core/next'], message: 'Only @studio/core, /admin, /schema, /migrations and /next are importable.' }] },
      ],
      // SPEC §4: a post created after deploy must render on demand.
      'no-restricted-syntax': [
        'error',
        { selector: "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='dynamicParams'] > Literal[value=false]", message: 'dynamicParams must stay true (SPEC §4).' },
        { selector: "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='dynamic'] > Literal[value='force-dynamic']", message: 'No force-dynamic on content routes (SPEC §4).' },
      ],
    },
  },
)

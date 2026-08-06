import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Serwist 產生的 service worker bundle，不需要 lint
    'public/sw.js',
    'public/sw.js.map',
    // Supabase CLI 在本機執行時產生的暫存檔
    'supabase/.temp/**',
    'supabase/.branches/**',
  ]),
])

export default eslintConfig

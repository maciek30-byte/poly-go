/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /**
   * DEV-ONLY. Set to `<role>:<status>` (e.g. `owner:locked`) to preview
   * account-status screens without a real profile fetch. Must NEVER be set
   * in production — see `src/shared/routing/useFakeProfile.ts`.
   */
  readonly VITE_DEV_FAKE_PROFILE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

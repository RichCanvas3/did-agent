/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SERVER_PRIVATE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 
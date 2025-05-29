interface ImportMetaEnv {
  readonly VITE_OPTIMISM_RPC_URL: string;
  // Add other VITE_ variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
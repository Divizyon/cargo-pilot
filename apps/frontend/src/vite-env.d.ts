/// <reference types="vite/client" />

declare module 'fflate' {
  export function unzipSync(
    data: Uint8Array,
    opts?: Record<string, unknown>,
  ): Record<string, Uint8Array>;
  export function zipSync(
    files: Record<string, Uint8Array>,
    opts?: Record<string, unknown>,
  ): Uint8Array<ArrayBuffer>;
  export function strFromU8(data: Uint8Array, latin1?: boolean): string;
  export function strToU8(str: string, latin1?: boolean): Uint8Array;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENV: 'development' | 'test' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

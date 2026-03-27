/**
 * Post AI Cloudflare Worker bindings
 */
export interface PostAIBindings {
  /** Direct Neon database URL for HTTP driver (secret binding) */
  DATABASE_URL: string

  /** Hyperdrive connection to PostgreSQL (kept for future TCP driver migration) */
  HYPERDRIVE: Hyperdrive

  /** D1 database for audit trail storage */
  DB: D1Database

  /** KV namespace for caching */
  CACHE_KV: KVNamespace

  /** Environment identifier */
  ENVIRONMENT?: string
}

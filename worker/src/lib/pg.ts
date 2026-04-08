/**
 * PostgreSQL operations via @g-a-l-a-c-t-i-c/data PostgreSQLAdapter
 *
 * Uses the platform's PostgreSQLAdapter which wraps the postgres driver.
 * Connection string comes from Hyperdrive binding for connection pooling.
 *
 * DESIGN NOTE: Singleton pattern is used here intentionally to prevent
 * connection leaks. Hyperdrive handles the actual TCP connection pooling,
 * and the PostgreSQLAdapter maintains a single connection to Hyperdrive.
 *
 * SAFETY: This module-level state is safe in Cloudflare Workers because:
 * 1. Worker isolates are single-threaded (no concurrent access)
 * 2. Each isolate handles one request at a time
 * 3. URL change detection prevents cross-tenant leaks if config changes
 *
 * TODO: If multi-tenant per-isolate becomes needed, refactor to use
 * per-tenant adapter caching via Request context or Durable Objects.
 */

import { PostgreSQLAdapter, sanitizeIdentifier } from '@g-a-l-a-c-t-i-c/data'
import { ServiceUnavailableError } from '@g-a-l-a-c-t-i-c/errors'
import type { PostAIBindings } from '../bindings'

export { sanitizeIdentifier }

// Module-level singleton - see DESIGN NOTE above
let adapter: PostgreSQLAdapter | null = null
let lastUrl: string | null = null

export function getPgAdapter(env: PostAIBindings): PostgreSQLAdapter {
  const url = env.HYPERDRIVE?.connectionString
  if (!url) {
    throw new ServiceUnavailableError('Hyperdrive connection not configured.')
  }
  // Recreate adapter if URL changes (prevents cross-tenant connection leaks)
  if (!adapter || lastUrl !== url) {
    adapter = new PostgreSQLAdapter(url)
    lastUrl = url
  }
  return adapter
}

export async function executeQuery<T = Record<string, unknown>>(
  adapter: PostgreSQLAdapter,
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  return adapter.query<T>(query, params)
}

export async function executeQueryOne<T = Record<string, unknown>>(
  adapter: PostgreSQLAdapter,
  query: string,
  params: unknown[] = [],
): Promise<T | null> {
  return adapter.queryOne<T>(query, params)
}

export async function executeTransaction(
  adapter: PostgreSQLAdapter,
  statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<unknown[]> {
  return adapter.transaction(async (tx) => {
    const results: unknown[] = []
    for (const stmt of statements) {
      const result = await tx.query(stmt.sql, stmt.params ?? [])
      results.push(result)
    }
    return results
  })
}

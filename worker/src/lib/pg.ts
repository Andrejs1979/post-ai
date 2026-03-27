/**
 * PostgreSQL operations via Neon serverless driver
 *
 * Uses the neon() HTTP driver for serverless-friendly queries.
 * Requires DATABASE_URL env var with the direct Neon connection string.
 * Hyperdrive is NOT used — Neon's HTTP endpoint handles connection pooling.
 */

import { neon } from '@neondatabase/serverless'
import { ServiceUnavailableError } from '@g-a-l-a-c-t-i-c/errors'
import type { PostAIBindings } from '../bindings'

export type NeonSQL = ReturnType<typeof neon>

export function getPgClient(env: PostAIBindings): NeonSQL {
  const url = env.DATABASE_URL
  if (!url) {
    throw new ServiceUnavailableError('DATABASE_URL not configured.')
  }
  return neon(url)
}

export async function executeQuery<T = Record<string, unknown>>(
  sql: NeonSQL,
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await sql.query(query, params)
  return result as T[]
}

export async function executeQueryOne<T = Record<string, unknown>>(
  sql: NeonSQL,
  query: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await sql.query(query, params)
  return (result[0] as T) ?? null
}

export async function executeTransaction(
  sql: NeonSQL,
  statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<unknown[]> {
  // Neon HTTP transactions: execute sequentially (each call is its own HTTP request)
  const results: unknown[] = []
  for (const stmt of statements) {
    const result = await sql.query(stmt.sql, stmt.params ?? [])
    results.push(result)
  }
  return results
}

export function sanitizeIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`)
  }
  return name
}

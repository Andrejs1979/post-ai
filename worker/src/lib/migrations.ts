/**
 * Migration runner for PostgreSQL via Neon serverless driver
 *
 * Uses the Neon HTTP driver for running migrations against PostgreSQL.
 */

import type { NeonSQL } from './pg'
import type { MigrationDefinition, MigrationStatusResponse } from '../types'

/**
 * Ensure the migrations tracking table exists.
 */
export async function initMigrationsTable(sql: NeonSQL): Promise<void> {
  await sql.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  )
}

/**
 * Apply pending migrations in version order.
 */
export async function applyMigrations(
  sql: NeonSQL,
  migrations: MigrationDefinition[],
): Promise<{ applied: number[] }> {
  await initMigrationsTable(sql)

  const appliedRows = await sql.query(`SELECT version FROM _migrations ORDER BY version`) as { version: number }[]
  const appliedSet = new Set(appliedRows.map((r) => r.version))
  const sorted = [...migrations].sort((a, b) => a.version - b.version)
  const newlyApplied: number[] = []

  for (const m of sorted) {
    if (appliedSet.has(m.version)) continue

    await sql.query(m.sql)
    await sql.query(
      `INSERT INTO _migrations (version, name, applied_at) VALUES ($1, $2, $3)`,
      [m.version, m.name, new Date().toISOString()],
    )

    newlyApplied.push(m.version)
  }

  return { applied: newlyApplied }
}

/**
 * Get migration status: which are applied and which are pending.
 */
export async function getMigrationStatus(
  sql: NeonSQL,
  migrations: MigrationDefinition[],
): Promise<MigrationStatusResponse> {
  await initMigrationsTable(sql)

  const appliedRows = await sql.query(
    `SELECT version, name, applied_at FROM _migrations ORDER BY version`,
  ) as { version: number; name: string; applied_at: string }[]

  const appliedVersions = new Set(appliedRows.map((r) => r.version))
  const pending = migrations.filter((m) => !appliedVersions.has(m.version))

  return {
    applied: appliedRows,
    pending,
  }
}

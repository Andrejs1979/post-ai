/**
 * Post AI shared types
 */

export interface QueryRequest {
  sql: string
  params?: unknown[]
}

export interface QueryOneRequest {
  sql: string
  params?: unknown[]
}

export interface TransactionStatement {
  sql: string
  params?: unknown[]
}

export interface TransactionRequest {
  statements: TransactionStatement[]
}

export interface MigrationDefinition {
  version: number
  name: string
  sql: string
}

export interface ApplyMigrationsRequest {
  migrations: MigrationDefinition[]
}

export interface MigrationStatusResponse {
  applied: { version: number; name: string; applied_at: string }[]
  pending: MigrationDefinition[]
}

export interface AuditQueryResult {
  entries: AuditEntryRecord[]
  count: number
}

export interface AuditEntryRecord {
  id: string
  entity_type: string
  entity_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  data: string
  previous_checksum: string | null
  checksum: string
  timestamp: string
  actor: string | null
  tenant_id: string
}

export interface AuditVerifyResult {
  valid: boolean
  brokenAt?: number
  totalEntries: number
}

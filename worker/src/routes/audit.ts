/**
 * Audit routes - query and verify audit trail
 *
 * Every write through Post AI creates an audit entry with
 * hash-chained integrity for compliance verification.
 */

import { Hono } from 'hono'
import type { PostAIBindings } from '../bindings'
import { getAuditHistory, verifyEntityAuditChain, initAuditTable } from '../lib/audit'

type Env = { Bindings: PostAIBindings; Variables: { tenantId: string; userId: string } }

export const auditRoutes = new Hono<Env>()

// GET /audit/:entityType/:entityId - query audit history
auditRoutes.get('/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType')
  const entityId = c.req.param('entityId')
  const tenantId = c.get('tenantId')

  await initAuditTable(c.env.DB)
  const entries = await getAuditHistory(c.env.DB, tenantId, entityType, entityId)

  return c.json({ data: entries, count: entries.length })
})

// GET /audit/verify/:entityType/:entityId - verify audit chain integrity
auditRoutes.get('/verify/:entityType/:entityId', async (c) => {
  const entityType = c.req.param('entityType')
  const entityId = c.req.param('entityId')
  const tenantId = c.get('tenantId')

  await initAuditTable(c.env.DB)
  const result = await verifyEntityAuditChain(c.env.DB, tenantId, entityType, entityId)

  return c.json({ data: result })
})

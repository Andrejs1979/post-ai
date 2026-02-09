# POST AI - Technical Architecture

**Last Updated:** 2026-02-09

---

## Overview

POST AI is an AI-native PostgreSQL platform built on Cloudflare's edge network. This document describes the technical architecture, data flows, and key design decisions.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (Next.js, React, Node.js, Python, Go, any PostgreSQL app) │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ PostgreSQL Wire Protocol
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EDGE INTELLIGENCE                       │
│             (Cloudflare Workers - 300+ locations)            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Query Router │  │  AI Analyzer │  │ Cache Manager│     │
│  │  - Latency   │  │  - Optimize  │  │  - L1: KV    │     │
│  │  - Residency │  │  - Rewrite   │  │  - L2: D1    │     │
│  │  - Load bal  │  │  - Index rec │  │  - L3: Cache │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ EU Regional  │ │ US Regional  │ │ APAC Regional│
│  (Hyperdrive)│ │  (Hyperdrive)│ │  (Hyperdrive)│
└──────────────┘ └──────────────┘ └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │     PRIMARY POSTGRESQL         │
        │   (Source of Truth)            │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │    AI OPTIMIZATION ENGINE      │
        │  (Separate compute cluster)    │
        └────────────────────────────────┘
```

---

## Component Architecture

### 1. Edge Layer (Cloudflare Workers)

**Purpose:** Route, cache, and optimize queries at the edge

**Components:**

#### Query Router
- Determines query destination based on:
  - Client location (latency-based routing)
  - Query type (read vs write)
  - Data residency rules
  - Endpoint health

#### AI Analyzer
- Analyzes incoming queries
- Rewrites for optimization
- Generates EXPLAIN plans
- Caches frequent query patterns

#### Cache Manager
- Manages three-tier cache hierarchy
- Handles cache invalidation
- Tracks cache hit rates

---

### 2. Cache Hierarchy

#### L1 Cache: Cloudflare KV
- **Latency:** <1ms
- **Use Case:** Hot keys, user sessions, feature flags
- **Hit Rate Target:** 85%+
- **TTL:** 5-60 minutes
- **Size:** Up to 1GB per account

#### L2 Cache: Cloudflare D1
- **Latency:** <5ms
- **Use Case:** Frequently accessed rows, cached query results
- **Hit Rate Target:** 70%+
- **TTL:** 1-30 minutes
- **Size:** Up to 5GB per database

#### L3 Cache: Hyperdrive
- **Latency:** <50ms
- **Use Case:** Connection pooling, regional query cache
- **Hit Rate Target:** 60%+
- **TTL:** Configurable per query

**Cache Efficiency:**
- Overall coverage: 91% of queries
- Efficiency ratio: 18.2x (91% coverage with 5% data replicated)

---

### 3. Regional Layer (Hyperdrive)

**Purpose:** Connection pooling and regional caching

**Components:**
- Connection poolers (PgB-compatible)
- Regional cache nodes
- Health monitoring
- Automatic failover

---

### 4. Database Layer

#### Primary PostgreSQL
- **Version:** PostgreSQL 16+
- **Hosting:** DigitalOcean, AWS, or GCP
- **Purpose:** Source of truth, all writes
- **Extensions:** pgvector, PostGIS, TimescaleDB, uuid-ossp

#### Read Replicas
- Streaming replication from primary
- Regional distribution (optional)
- Automatic promotion on failure

---

### 5. AI Optimization Engine

**Purpose:** Analyze query patterns and generate recommendations

**Components:**

#### Query Analyzer
- Captures queries via pg_stat_statements
- Analyzes EXPLAIN output
- Identifies performance bottlenecks
- Tracks query patterns over time

#### Index Recommendation Engine
- ML-based index suggestion
- ROI calculation (time saved vs storage cost)
- Redundant index detection
- Composite index optimization

#### Schema Optimizer
- Bloat detection
- Compression opportunities
- Archival recommendations
- Partitioning suggestions

---

## Data Flows

### Read Query Flow (95% of traffic)

```
1. Client → Edge Worker
   ↓
2. Parse query (PostgreSQL wire protocol)
   ↓
3. Check L1 cache (KV)
   HIT → Return result (1ms) ✅
   MISS → Continue
   ↓
4. Check L2 cache (D1)
   HIT → Return result (5ms) ✅
   MISS → Continue
   ↓
5. Check L3 cache (Hyperdrive)
   HIT → Return result (50ms) ✅
   MISS → Continue
   ↓
6. Route to nearest regional endpoint
   ↓
7. Execute on PostgreSQL or read replica
   ↓
8. Return result to client (150ms)
   ↓
9. Cascade result through L3 → L2 → L1
```

### Write Query Flow (5% of traffic)

```
1. Client → Edge Worker
   ↓
2. Parse query (PostgreSQL wire protocol)
   ↓
3. Route to primary PostgreSQL (always)
   ↓
4. Execute write (INSERT/UPDATE/DELETE)
   ↓
5. Invalidate affected caches (L1, L2, L3)
   ↓
6. CDC event capture
   ↓
7. Async: Update edge caches (~500ms lag)
```

### AI Optimization Flow (Background)

```
1. Capture query → pg_stat_statements
   ↓
2. Periodic analysis (every 5 minutes)
   ↓
3. Identify slow queries, missing indexes
   ↓
4. Generate recommendations
   ↓
5. User approval (or auto-apply)
   ↓
6. Monitor impact
   ↓
7. Refine models
```

---

## Technology Stack

### Edge Layer
| Component | Technology |
|-----------|------------|
| Compute | Cloudflare Workers |
| L1 Cache | Cloudflare KV |
| L2 Cache | Cloudflare D1 (SQLite at edge) |
| L3 Cache | Cloudflare Hyperdrive |
| Object Storage | Cloudflare R2 |

### Database Layer
| Component | Technology |
|-----------|------------|
| Primary DB | PostgreSQL 16+ |
| Replication | Streaming replication |
| CDC | Debezium → Kafka |
| Extensions | pgvector, PostGIS, TimescaleDB |

### AI Layer
| Component | Technology |
|-----------|------------|
| Schema/Query LLM | Claude 3.5 Sonnet |
| Pattern Recognition | Custom TensorFlow models |
| Embeddings | OpenAI text-embedding-3 |
| Vector Search | pgvector |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Orchestration | Kubernetes |
| Monitoring | Prometheus + Grafana |
| Logging | Loki |
| Error Tracking | Sentry |
| CI/CD | GitHub Actions |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Global p95 latency (reads) | <10ms |
| Primary write latency | <150ms |
| Cache hit rate | 90%+ |
| Uptime | 99.99% |
| Time to first query | <60 seconds |

---

## Security Architecture

### Authentication
- PostgreSQL wire protocol authentication (SCRAM-SHA-256)
- API token authentication for management API
- SSO/SAML for enterprise (Month 9+)

### Authorization
- Role-based access control (RBAC)
- Database-level permissions
- Row-level security (RLS) support

### Encryption
- In transit: TLS 1.3
- At rest: AES-256
- Key management: Cloudflare KMS

### Compliance
- GDPR compliant (geographic routing)
- SOC2 Type II (Month 9)
- HIPAA compliant (Month 15)

---

## Scalability

### Horizontal Scaling
- Edge: Automatic (300+ Cloudflare locations)
- Regional: Add Hyperdrive pools per region
- Database: Read replicas via streaming replication
- AI: Separate compute cluster with auto-scaling

### Vertical Scaling
- Primary database: Resize on demand
- Connection pools: Dynamic based on load
- Cache size: Configurable per tier

### Scaling Limits
| Resource | Limit |
|----------|-------|
| Single database | 10TB |
| Queries/second | 100K+ |
| Concurrent connections | 10K+ |
| Databases per account | Unlimited (Pro+) |

---

## Disaster Recovery

### Backup Strategy
- Continuous backup to R2 (object storage)
- Point-in-time recovery (PITR)
- 30-day retention (default)

### Failover
- Automatic read replica promotion
- Multi-region failover (<30 seconds)
- Health monitoring with automatic rerouting

### RTO/RPO
| Scenario | RTO | RPO |
|----------|-----|-----|
| Primary failure | 30s | 0s |
| Regional outage | <10s | 0s |
| Cache failure | <1s | 0s |

---

## Monitoring & Observability

### Metrics Collected
- Query latency (p50, p95, p99)
- Cache hit rates (per tier)
- Error rates and types
- Connection pool utilization
- Storage usage
- AI recommendation impact

### Dashboards
- Real-time performance
- Geographic latency map
- Query analytics
- Cost breakdown

### Alerts
- High error rate
- Latency degradation
- Cache misses spike
- Storage threshold
- AI recommendations available

---

## Design Decisions

### 1. Why Cloudflare Workers?
- **Pros:** 300+ locations, free tier generous, Workers AI available
- **Cons:** CPU time limits, cold starts
- **Decision:** Edge performance outweighs limitations

### 2. Why PostgreSQL-only?
- **Pros:** Largest growing DB market, developer preference
- **Cons:** Smaller than MySQL market
- **Decision:** PostgreSQL growth trend + AI optimization opportunity

### 3. Why multi-tier cache?
- **Pros:** Maximizes hit rate, minimizes latency
- **Cons:** Complexity, consistency challenges
- **Decision:** Performance is primary differentiator

### 4. Why AI as separate service?
- **Pros:** No edge CPU limits, can scale independently
- **Cons:** Additional latency for AI features
- **Decision:** AI is async/batch, not latency-critical

---

## Future Considerations

### Multi-Region Writes (Month 10+)
- CRDT-based conflict resolution
- Active-active replication
- Last-write-wins with timestamps

### GraphQL Support (Month 12+)
- Auto-generated GraphQL API
- Type-safe queries
- Real-time subscriptions

### Edge Functions (Month 12+)
- User-defined edge compute
- Database triggers at edge
- Custom business logic

---

## References

- Cloudflare Workers: https://developers.cloudflare.com/workers/
- PostgreSQL Protocol: https://www.postgresql.org/docs/current/protocol.html
- pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html

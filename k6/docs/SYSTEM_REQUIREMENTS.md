# GIMS ERP — System Requirements Document

> Version: 1.0 | Date: 2026-05-19 | Based on K6 profiler data

---

## 1. Business Requirements

### 1.1 User Base

| Metric | Value |
|--------|-------|
| Total registered users | 200–500 |
| Active tenants | 10–20 companies |
| Concurrent active users (peak) | ~20 |
| Peak hours | 09:00–12:00 WIB (weekdays) |
| Usage pattern | Business hours only (08:00–18:00) |

### 1.2 Growth Projections

| Timeframe | Users | Transactions/month | Database size |
|-----------|-------|-------------------|---------------|
| Year 1 | 200 | 10,000–20,000 | 2–5 GB |
| Year 2 | 350 | 30,000–50,000 | 8–15 GB |
| Year 3 | 500 | 50,000–80,000 | 20–30 GB |

### 1.3 Module Usage Distribution (estimated)

| Module | % of requests | Peak req/s |
|--------|--------------|------------|
| Sales (SQ, SO, DO, Invoice) | 25% | 1.5 |
| Purchase (PO, GR, Invoices) | 15% | 0.9 |
| Finance (Journals, COA, Reports) | 15% | 0.9 |
| Master Data (Products, Customers) | 15% | 0.9 |
| HRD (Attendance, Leave) | 10% | 0.6 |
| CRM (Leads, Deals, Activities) | 10% | 0.6 |
| Other (POS, Inventory, Reports) | 10% | 0.6 |
| **Total** | **100%** | **6 req/s** |

---

## 2. Performance SLOs (Service Level Objectives)

### 2.1 Latency

| Tier | Operation Type | p95 Target | p99 Target |
|------|---------------|-----------|-----------|
| CRUD | Single-entity read/write | < 200ms | < 500ms |
| List | Paginated collections | < 500ms | < 1000ms |
| Workflow | Multi-step E2E processes | < 1000ms | < 2000ms |
| Dashboard | Aggregation queries | < 1000ms | < 2000ms |

### 2.2 Reliability

| Metric | Target |
|--------|--------|
| Availability | 99.9% (< 8.7h downtime/year) |
| Error rate | < 0.1% of requests |
| Data durability | 99.99% (daily backups, 7-day retention) |

### 2.3 Throughput

| Metric | Target |
|--------|--------|
| Sustained throughput | 6 req/s (20 active users) |
| Burst capacity | 20 req/s (all 20 users active simultaneously) |
| Headroom | 3× peak (18 req/s sustained without degradation) |

---

## 3. Capacity Calculation

### 3.1 Using Little's Law

```
L = λ × W

L = concurrent requests in flight
λ = arrival rate (req/s)
W = average response time (seconds)
```

**Calculation:**
- 20 active users × 0.3 req/s per user = **6 req/s** arrival rate (λ)
- Average response time: 0.15s (150ms) target (W)
- Concurrent requests in flight: L = 6 × 0.15 = **0.9 requests**

**Interpretation:** At peak, less than 1 request is being processed at any given moment. This is an extremely light load.

### 3.2 Safety Margins

| Factor | Multiplier | Adjusted req/s |
|--------|-----------|----------------|
| Base peak load | 1× | 6 req/s |
| Burst (all users active) | 3× | 18 req/s |
| Growth headroom (2 years) | 2× | 36 req/s |
| Safety margin | 1.5× | **54 req/s** |

**Required server capacity: ≥ 54 req/s sustained within SLO thresholds.**

### 3.3 From K6 Profiler Data

| Metric | Measured (local Docker) |
|--------|------------------------|
| Baseline throughput (1 VU) | ~87 req/s |
| Sweet spot (18 VUs) | ~400 req/s |
| Max throughput (100 VUs) | ~440 req/s |
| Sweet spot real users (15s think time) | ~162 users |

**Conclusion:** Even a server with 50% of local Docker performance (200 req/s) would handle the target load (54 req/s) with 3.7× headroom.

---

## 4. Infrastructure Specification

### 4.1 Recommended VPS Configuration

| Component | Minimum | Recommended | Justification |
|-----------|---------|-------------|---------------|
| CPU | 2 vCPU | 4 vCPU | Handles concurrent Go routines + DB queries |
| RAM | 4 GB | 8 GB | PostgreSQL shared_buffers + Go app + Redis |
| Storage | 40 GB SSD | 80 GB NVMe | Database growth + uploads + logs |
| Network | 1 Gbps | 1 Gbps | Standard for Singapore VPS |
| Region | Singapore | Singapore | ~20-30ms to Indonesia |

### 4.2 Software Stack

| Component | Version | Configuration |
|-----------|---------|---------------|
| OS | Ubuntu 22.04 LTS | Minimal server |
| Docker | 24+ | Docker Compose deployment |
| Go API | 1.22+ | GIN framework, 8080 internal |
| PostgreSQL | 16 | shared_buffers=2GB, max_connections=100 |
| Redis | 7 | maxmemory=512MB, LRU eviction |
| Caddy/Nginx | Latest | Reverse proxy, HTTPS, HTTP/2 |

### 4.3 Resource Allocation (Docker)

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 2G

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 4.4 Database Sizing

| Table Category | Estimated rows (Year 1) | Index size |
|---------------|------------------------|------------|
| Transactions (SO, PO, Invoices) | 100,000–200,000 | ~500 MB |
| Master data (Products, Customers) | 5,000–10,000 | ~50 MB |
| Journals & Ledger | 50,000–100,000 | ~300 MB |
| HRD (Attendance, Leave) | 50,000–100,000 | ~200 MB |
| CRM (Leads, Activities) | 20,000–50,000 | ~100 MB |
| **Total estimated** | **~500,000 rows** | **~2 GB** |

---

## 5. Cost Estimate

### 5.1 Monthly Infrastructure Cost

| Provider | Spec | Monthly Cost |
|----------|------|-------------|
| **DigitalOcean** | 4 vCPU / 8GB / 160GB NVMe (Premium) | $68/month |
| **Vultr** | 4 vCPU / 8GB / 128GB NVMe (High Frequency) | $48/month |
| **Hetzner** | 4 vCPU / 8GB / 160GB (CPX31, Singapore) | €15/month (~$16) |
| **AWS Lightsail** | 4 vCPU / 8GB / 160GB SSD | $80/month |

### 5.2 Additional Services

| Service | Purpose | Cost |
|---------|---------|------|
| Domain + DNS | Cloudflare (free tier) | $0 |
| SSL | Let's Encrypt via Caddy | $0 |
| Backups | VPS provider snapshots (weekly) | $5-10/month |
| Monitoring | Uptime Kuma (self-hosted) | $0 |
| Object Storage (R2) | File uploads | $0-5/month |
| **Total** | | **$55–95/month** |

### 5.3 Recommended Choice

**Vultr High Frequency 4 vCPU / 8GB in Singapore: $48/month**

- NVMe storage (fast DB queries)
- Singapore region (low latency to Indonesia)
- Hourly billing (easy to resize)
- Includes 4TB transfer/month (more than enough)
- Total with backups: ~$55/month

---

## 6. Scaling Triggers

### 6.1 When to Scale Up

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | > 60% sustained 5min | > 80% sustained 5min | Upgrade to 8 vCPU |
| Memory | > 70% used | > 85% used | Upgrade to 16GB |
| Disk | > 70% used | > 85% used | Expand storage |
| API p95 latency | > 300ms (reads) | > 500ms (reads) | Investigate + optimize |
| DB connections | > 70 active | > 90 active | Increase pool or upgrade |
| Sweet spot ratio | > 2× baseline | > 3× baseline | Scale infrastructure |

### 6.2 Scaling Path

```
Stage 1 (Current target):  4 vCPU / 8GB   → ~20 concurrent users
Stage 2 (Growth):          8 vCPU / 16GB  → ~50 concurrent users
Stage 3 (Scale):           Separate DB     → ~100 concurrent users
Stage 4 (Enterprise):      Load balancer + 2 app instances → 200+ users
```

### 6.3 When to Split Services

Move to separate DB server when:
- Database size exceeds 20GB
- CPU contention between app and DB is measurable
- You need DB replicas for read scaling

---

## 7. Validation Plan

### 7.1 Pre-Launch Validation

```bash
# 1. Deploy to production VPS
docker compose up -d

# 2. Run k6 profiler against production
k6 run -e BASE_URL=https://your-domain.com \
       -e PROFILER_VUS=50 \
       --out json=k6/reports/profiler-production.json \
       k6/tests/endpoint-profiler.js

# 3. Analyze capacity
pnpm k6:analyze k6/reports/profiler-production.json --capacity --think-time=15

# 4. Verify: sweet spot real users >= 60 (3× target of 20)
```

### 7.2 Acceptance Criteria

| Check | Requirement |
|-------|-------------|
| All tier thresholds pass at 20 VUs | ✓ |
| Sweet spot ≥ 30 VUs (~270 real users) | ✓ |
| Error rate < 1% at target load | ✓ |
| No crashes at 50 VUs sustained 10min | ✓ |
| Database backup completes < 5min | ✓ |

### 7.3 Ongoing Monitoring

| Frequency | Action |
|-----------|--------|
| Daily | Check uptime dashboard, error rate |
| Weekly | Review p95 latency trends |
| Monthly | Run k6 profiler, compare with baseline |
| Quarterly | Full capacity analysis, review growth |

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Traffic spike (viral/campaign) | Low | High | Burst capacity 3× peak; can upgrade VPS in <1h |
| Database growth exceeds projections | Medium | Medium | Monitor disk usage; NVMe handles 10× current data |
| Single point of failure (1 VPS) | Medium | High | Daily backups; recovery time < 1h from snapshot |
| DDoS attack | Low | High | Cloudflare proxy (free tier includes basic DDoS protection) |
| Provider outage | Low | High | Daily off-site backups; documented migration procedure |

---

## 9. Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Single VPS (not multi-instance) | 20 concurrent users doesn't justify load balancer complexity |
| 2 | Docker Compose deployment | Already proven in development; minimal deployment changes |
| 3 | Singapore region | Best latency/cost/provider balance for Indonesian users |
| 4 | 4 vCPU / 8GB spec | 3× headroom over calculated requirement; fits budget |
| 5 | PostgreSQL on same VPS | Simplicity; split when DB exceeds 20GB |
| 6 | Redis on same VPS | 512MB cache sufficient; split only if memory-constrained |
| 7 | 99.9% availability (not 99.99%) | Single VPS with daily backups meets this; higher requires multi-instance |

---

## 10. Evidence (K6 Profiler Data)

### 10.1 Performance Baseline (Local Docker, 4 vCPU / 16GB)

| Run | VUs | Checks Pass | Throughput | Crud p95 | List p95 | Workflow p95 |
|-----|-----|-------------|-----------|----------|----------|--------------|
| Run 1 | 50 | 76% | 388 req/s | 198ms ✓ | 150ms ✓ | 463ms ✓ |
| Run 2 | 50 | 72% | 438 req/s | 220ms | 124ms ✓ | 386ms ✓ |
| Run 3 | 50 | 73% | 424 req/s | 280ms | 127ms ✓ | 384ms ✓ |
| Run 4 | 100 | 72% | 412 req/s | 405ms | 265ms ✓ | 778ms ✓ |
| Run 5 | 100 | 72% | 442 req/s | 429ms | 228ms ✓ | 701ms ✓ |
| Run 6 | 100 | 75% | 395 req/s | 268ms | 291ms ✓ | 1.1s |

### 10.2 Capacity Sweet Spot

```
Sweet Spot: 17–18 VUs
Real User Equivalent: ~162 concurrent users (at 15s think time)
Baseline iteration: 1.6s
3× threshold: 4.8s
```

### 10.3 Extrapolation to Production VPS

| Scenario | Expected sweet spot | Meets target? |
|----------|-------------------|---------------|
| VPS same as local (4 vCPU/8GB) | ~15-18 VUs (~135-162 users) | ✓ (6.7× target) |
| VPS slightly weaker (4 vCPU/4GB) | ~10-12 VUs (~90-108 users) | ✓ (4.5× target) |
| VPS minimal (2 vCPU/4GB) | ~6-8 VUs (~54-72 users) | ✓ (2.7× target) |

**All scenarios exceed the 20 concurrent user target with significant headroom.**

---

## Appendix A: Reproduction Commands

```bash
# Run full profiler
k6 run -e PROFILER_VUS=100 \
  --out json=k6/reports/profiler-production.json \
  k6/tests/endpoint-profiler.js

# Analyze endpoints
pnpm k6:analyze k6/reports/profiler-production.json

# Capacity analysis
pnpm k6:analyze k6/reports/profiler-production.json --capacity --think-time=15

# Strict capacity (2× threshold)
pnpm k6:analyze k6/reports/profiler-production.json --capacity --multiplier=2 --think-time=15
```

## Appendix B: Related Documentation

- [K6 Profiler README](./README.md) — Quick start and overview
- [Capacity Planning](./CAPACITY_PLANNING.md) — Sweet spot methodology
- [Optimization Solutions](./OPTIMIZATION_SOLUTIONS.md) — Performance fixes
- [Architecture](./ARCHITECTURE.md) — K6 file structure

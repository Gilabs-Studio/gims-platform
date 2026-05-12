# k6 Performance Testing for GIMS ERP

Load testing suite built with [Grafana k6](https://k6.io) for the GIMS ERP platform.

## Prerequisites

```bash
# Install k6
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo apt-get install k6

# Verify
k6 version
```

## Quick Start

```bash
# 1. Start GIMS API
cd apps/api && air
# or: pnpm dev:local

# 2. Set test credentials (override defaults in k6/config.js)
export TEST_EMAIL=admin@gilabs.com
export TEST_PASSWORD=your_password

# 3. Run smoke test (quick validation)
k6 run k6/smoke-test.js

# 4. Run load test (simulated normal traffic)
k6 run k6/load-test.js

# 5. Run stress test (find breaking point)
k6 run k6/stress-test.js
```

## Standard Benchmark Matrix

Run these profiles as the default release benchmark pipeline:

| Stage | Goal | Command | Pass Gate |
| --- | --- | --- | --- |
| Smoke | Fast functional + auth validation | `pnpm k6:smoke` | 0 failed checks, `http_req_failed < 1%` |
| Baseline Load | Normal business-hour traffic | `pnpm k6:load:baseline` | `p95 < 500ms`, `p99 < 1000ms`, `http_req_failed < 1%` |
| Peak Load | Peak-hour traffic | `pnpm k6:load:peak` | No sustained 5xx spikes, error rate below 1% |
| Quick Stress | Fast breakpoint sanity check | `pnpm k6:stress:quick` | No threshold abort, no runaway failures |
| Full Stress | Capacity/breakpoint test | `pnpm k6:stress:full` | Identify first SLO breach point and stable max load |
| Soak | Long-run stability | `pnpm k6:soak` | No memory/connection drift, stable latency |

Use this order in staging before production release.

For local development where latency may be noisy, run relaxed smoke (availability-only threshold):

```bash
pnpm k6:smoke:local
```

## Benchmark Profiles (Env Overrides)

```bash
# Staging target
k6 run -e BASE_URL=https://staging.your-domain.com k6/smoke-test.js

# Baseline load (module-level browse + transactional mix)
k6 run -e VUS=20 -e DURATION=10m k6/load-test.js

# Peak load
k6 run -e VUS=50 -e DURATION=15m k6/load-test.js

# Soak
k6 run -e VUS=30 -e DURATION=60m k6/load-test.js

# Stress quick and full
k6 run -e QUICK=1 -e MAX_VUS=20 k6/stress-test.js
k6 run -e MAX_VUS=100 k6/stress-test.js
```

## Release Gate Recommendation

- Required for each release candidate:
  - Smoke + Baseline Load must pass.
- Required for major release / infra change:
  - Smoke + Baseline + Peak + Full Stress.
- Required weekly:
  - Soak run to detect slow regressions.

If any gate fails, treat it as release-blocking until root cause is identified.

## Test Files

| File             | Purpose                                                      | When to Run                            |
| ---------------- | ------------------------------------------------------------ | -------------------------------------- |
| `config.js`      | Shared thresholds, workload configs, endpoint registry       | —                                      |
| `auth-helper.js` | Authentication helpers (CSRF + JWT login)                    | —                                      |
| `smoke-test.js`  | **1 VU, 5 iterations** — quick validation all endpoints work | Every deploy, CI pipeline              |
| `load-test.js`   | **20 VUs for 5 minutes** — normal business hours traffic     | Before release, weekly                 |
| `stress-test.js` | **Ramps to 200+ VUs** — finds the breaking point             | Before major launch, capacity planning |

## Configuration

All settings are in `k6/config.js` and can be overridden via environment variables:

```bash
# Target server
k6 run -e BASE_URL=https://staging.gilabs.com k6/load-test.js

# Credentials (must match a real user)
k6 run -e TEST_EMAIL=test@example.com -e TEST_PASSWORD=secret k6/load-test.js

# Custom VUs and duration (load test)
k6 run -e VUS=50 -e DURATION=10m k6/load-test.js

# Max VUs for stress test
k6 run -e MAX_VUS=500 k6/stress-test.js
```

## Thresholds (Pass/Fail Criteria)

| Metric                            | Smoke/Load | Stress                     |
| --------------------------------- | ---------- | -------------------------- |
| Error rate (`http_req_failed`)    | < 1%       | < 1% (auto-aborts on fail) |
| P95 latency (`http_req_duration`) | < 500ms    | < 1000ms                   |
| P99 latency (`http_req_duration`) | < 1000ms   | < 2000ms                   |

## Key Metrics to Watch

k6 outputs these automatically in the summary:

- **`http_req_duration`** — how long each request takes (avg, min, med, max, p90, p95, p99)
- **`http_req_failed`** — percentage of failed requests
- **`http_reqs`** — total requests made
- **`iterations`** — how many times the test function ran
- **`vus`** / **`vus_max`** — active & max virtual users
- **`checks`** — % of assertions that passed

## Output Options

```bash
# JSON output (for dashboards/analysis)
k6 run --out json=results.json k6/load-test.js

# CSV output
k6 run --out csv=results.csv k6/load-test.js

# Grafana Cloud (requires k6 cloud token)
k6 run --out cloud k6/load-test.js

# HTML report (via k6-reporter)
k6 run --out json=results.json k6/load-test.js
# Then generate HTML (requires k6-html-reporter installed)

# InfluxDB + Grafana dashboard
k6 run --out influxdb=http://localhost:8086/k6 k6/load-test.js
```

## Interpretasi Hasil

### Load Test

- **Baik**: Error rate < 1%, P95 < 500ms, throughput stabil
- **Perlu optimasi**: P95 > 500ms pada beban normal → cek query DB, indexing, atau N+1
- **Perlu scaling**: P99 naik tajam saat VU naik → bottleneck di CPU/connection pool

### Stress Test

- **Ideal**: Test berjalan sampai VU maksimal tanpa `abortOnFail` ter-trigger
- **Perlu diinvestigasi**: Test abort lebih awal → cek log backend, DB connection pool exhausted, lock contention
- **Grafana + pprof**: Aktifkan `/metrics` dan `/debug/pprof` sebelum stress test untuk profiling

## Auth Flow

GIMS uses CSRF double-submit cookie + JWT:

1. `GET /api/v1/auth/csrf` → dapatkan `csrf_token` cookie
2. `POST /api/v1/auth/login` → kirim `X-CSRF-Token` header, dapat JWT `token`
3. Semua request authenticated: `Authorization: Bearer <token>`

Helper otomatis menangani flow ini (`auth-helper.js`). Token di-cache per VU untuk menghindari login berulang.

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Smoke Test
  run: |
    k6 run k6/smoke-test.js --summary-export=smoke-summary.json
- name: Check Thresholds
  run: |
    # k6 returns non-zero exit code if thresholds fail
    # This gates deployment automatically
```

```bash
# GitLab CI
k6 run k6/smoke-test.js 2>&1 | tee smoke-output.txt
if [ $? -ne 0 ]; then
  echo "Smoke test failed — blocking deployment"
  exit 1
fi
```

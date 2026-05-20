# Reporting

> Analyzer, report format, and interpreting results

[← Configuration](./CONFIGURATION.md) | [Capacity Planning →](./CAPACITY_PLANNING.md)

---

## Report Analyzer (`scripts/analyze-report.js`)

A Node.js script that parses k6 JSON output into a human-readable terminal table and machine-readable JSON report.

### Usage

```bash
# Auto-detect latest report in k6/reports/
pnpm k6:analyze

# Specific file
pnpm k6:analyze k6/reports/profiler-20260519-034300.json

# Custom thresholds
pnpm k6:analyze k6/reports/profiler-latest.json --thresholds crud=300,list=800,workflow=2000
```

### How It Works

1. **Parse** — Reads k6 JSON output line-by-line (streaming, handles multi-GB files)
2. **Group** — Groups `http_req_duration` metrics by `{endpoint, module, tier}` tags
3. **Compute** — Calculates p50/p95/p99, error rate, and req/s per endpoint
4. **Flag** — Assigns severity (🟢🟡🔴) based on tier thresholds
5. **Output** — Terminal table (sorted by p95 desc) + JSON file

### Auto-Detection

When no file argument is provided, the analyzer scans `k6/reports/` for files matching `profiler-YYYYMMDD-HHMMSS.json` and picks the most recent one.

---

## Terminal Output

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  GIMS ERP Endpoint Profiler Report                                               ║
║  Run: 2026-05-18T20:43:11.758Z | Duration: 752 | Endpoints: 111                 ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║ Flag │ Module       │ Endpoint                       │ Tier     │ p50   │ p95   │ p99   │ Err% │ req/s ║
║──────┼──────────────┼────────────────────────────────┼──────────┼───────┼───────┼───────┼──────┼───────║
║ 🔴  │ general      │ general:dashboard              │ crud     │ 112ms │ 813ms │ 1.1s  │ 0.00 │ 3.6   ║
║ 🟡  │ master-data  │ master:roles:list              │ list     │ 271ms │ 630ms │ 858ms │ 0.00 │ 3.6   ║
║ 🟢  │ crm          │ crm:leads:list                 │ list     │ 22ms  │ 195ms │ 332ms │ 0.00 │ 3.6   ║
║ 🟢  │ product      │ product:categories:list        │ list     │ 5ms   │ 42ms  │ 89ms  │ 0.00 │ 3.6   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

### Module Summary

```
── Module Summary ──────────────────────────────────────────────────────────────
Module          │ Endpoints │ Avg p95  │ Err%   │ 🟢  │ 🟡  │ 🔴
────────────────┼───────────┼──────────┼────────┼─────┼─────┼────
general         │ 2         │ 512ms    │ 0.00%  │ 0   │ 1   │ 1
sales           │ 11        │ 248ms    │ 2.53%  │ 10  │ 1   │ 0
crm             │ 14        │ 123ms    │ 14.29% │ 14  │ 0   │ 0
product         │ 7         │ 56ms     │ 0.00%  │ 7   │ 0   │ 0
```

---

## JSON Report Format

Saved to `k6/reports/profiler-*-analyzed.json`:

```json
{
  "meta": {
    "runStart": "2026-05-18T20:43:11.758Z",
    "duration": 752,
    "endpointCount": 111
  },
  "endpoints": [
    {
      "name": "sales:quotations:list",
      "module": "sales",
      "tier": "list",
      "p50": 31,
      "p95": 221,
      "p99": 372,
      "errorRate": 0.0,
      "reqPerSec": 3.6,
      "flag": "green",
      "sampleCount": 2734
    }
  ],
  "modules": [
    {
      "name": "sales",
      "endpointCount": 11,
      "avgP95": 248,
      "errorRate": 2.53,
      "green": 10,
      "yellow": 1,
      "red": 0
    }
  ]
}
```

---

## Interpreting Results

### Severity Flags

| Flag | Meaning | Action |
|------|---------|--------|
| 🟢 | Within SLA | No action needed |
| 🟡 | Approaching limit (1-2× threshold) | Monitor, optimize if trending up |
| 🔴 | Exceeds SLA (>2× threshold) | Investigate and optimize |

### Common Patterns

| Pattern | Likely Cause | Solution |
|---------|-------------|----------|
| Single endpoint 🔴, rest 🟢 | Slow query or N+1 | Profile the specific query |
| Entire module 🟡 | Missing index or heavy joins | Add database indexes |
| All endpoints degrade at high VUs | Connection pool exhaustion | Increase pool size |
| High error rate on one module | Permission misconfiguration | Check RBAC setup |
| p99 >> p95 | Occasional GC pauses or locks | Check for table locks |

### Comparing Runs

Use the JSON reports to track performance over time:

```bash
# Compare two runs
diff <(jq '.endpoints[] | {name, p95}' run1-analyzed.json) \
     <(jq '.endpoints[] | {name, p95}' run2-analyzed.json)
```

Key metrics to track across runs:
- **p95 per endpoint** — is it getting slower?
- **Error rate** — are new errors appearing?
- **Throughput (req/s)** — is capacity decreasing?

---

## Performance Baselines (from 5 runs)

| VUs | Avg Checks Pass | Crud p95 | List p95 | Workflow p95 | Throughput |
|-----|----------------|----------|----------|--------------|------------|
| 50 | 73% | 198-280ms | 124-150ms | 384-463ms | ~400 req/s |
| 100 | 71% | 405-429ms | 228-265ms | 701-778ms | ~440 req/s |

**Observations:**
- List and workflow tiers scale well (stay within thresholds at 100 VUs)
- CRUD tier degrades at 50+ VUs (bcrypt login + accumulated data)
- Throughput plateaus around 440 req/s regardless of VU count
- Backend is stable — no crashes at 100 VUs

---

## Generating Reports

### Full Profiler Run + Analysis

```bash
# Run profiler with JSON output
k6 run --out json=k6/reports/profiler-$(date +%Y%m%d-%H%M%S).json k6/tests/endpoint-profiler.js

# Analyze (auto-detects latest)
pnpm k6:analyze
```

### CI/CD Integration

```bash
# Run with strict thresholds — exits non-zero if any threshold fails
k6 run k6/tests/endpoint-profiler.js

# Check exit code
if [ $? -ne 0 ]; then
  echo "Performance regression detected!"
  pnpm k6:analyze
  exit 1
fi
```

---

## Related Docs

- [Methodology](./METHODOLOGY.md) — Tier system and severity logic
- [Configuration](./CONFIGURATION.md) — Threshold configuration
- [Coverage Plan](./implementation%20journey/K6_COVERAGE_PLAN.md) — Historical performance results

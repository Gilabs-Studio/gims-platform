# Capacity Planning — Sweet Spot Analysis

> Find the optimal concurrent user count where the system performs within acceptable latency

[← Reporting](./REPORTING.md) | [Optimization Solutions →](./OPTIMIZATION_SOLUTIONS.md)

---

## Overview

The capacity planning module answers: **"How many real concurrent users can this system handle before performance degrades unacceptably?"**

It works by analyzing a single profiler run (ramping from 1 → N VUs) and finding the **knee** in the degradation curve — the point where adding more users causes disproportionate slowdown.

---

## Key Concepts

### Sweet Spot (Knee)

The VU count where iteration duration exceeds a multiplier of the baseline. Below this point, the system scales linearly. Above it, degradation accelerates.

```
Latency
  │                          ╭── Danger zone (>3× baseline)
  │                     ╭────╯
  │                ╭────╯
  │           ╭────╯ ← Knee (sweet spot)
  │      ╭────╯
  │ ─────╯ ← Linear scaling zone
  └──────────────────────── VUs
```

### Baseline

The iteration duration at minimum load (1 VU). This represents the best-case latency when the system has no contention.

### Multiplier (3×)

The threshold ratio. When iteration duration exceeds `baseline × multiplier`, the system is past its sweet spot. Default is 3× — meaning the system is "acceptably degraded" up to 3× its idle performance.

### Real User Equivalent

Profiler VUs are synthetic — each VU hits ~140 endpoints per iteration with minimal think time. Real users have significant think time (10-30s between actions). The real user multiplier converts VUs to estimated concurrent users:

```
Real Users = VUs × (think_time / baseline_iteration_duration)
```

---

## Usage

### Basic Capacity Analysis

```bash
# Run profiler with 100 VUs (need high VU count to find the knee)
k6 run -e PROFILER_VUS=100 --out json=k6/reports/profiler-capacity.json k6/tests/endpoint-profiler.js

# Analyze with capacity mode
pnpm k6:analyze k6/reports/profiler-capacity.json --capacity
```

### Configuration Options

| Flag | Default | Description |
|------|---------|-------------|
| `--capacity` | — | Enable capacity analysis mode |
| `--multiplier=N` | `3` | Baseline multiplier threshold |
| `--think-time=N` | `15` | Real user think time in seconds |

### Examples

```bash
# Default: 3× multiplier, 15s think time
pnpm k6:analyze report.json --capacity

# Strict threshold (2× baseline)
pnpm k6:analyze report.json --capacity --multiplier=2

# API consumers (fast, 5s between requests)
pnpm k6:analyze report.json --capacity --think-time=5

# Casual users (slow, 30s between actions)
pnpm k6:analyze report.json --capacity --think-time=30

# Combined
pnpm k6:analyze report.json --capacity --multiplier=2 --think-time=10
```

---

## How It Works

### Step 1: Collect VU and Iteration Data

During k6 JSON parsing, the analyzer collects:
- `vus` metric points — VU count at each timestamp
- `iteration_duration` metric points — how long each iteration took

### Step 2: Detect VU Stages

The analyzer identifies stable VU levels from the `vus` metric stream. A "stage" is a period where VU count remains constant for 3+ consecutive data points.

```
Raw VU data:  1,1,1,2,3,5,8,10,10,10,10,10,15,20,25,25,25,25...
Detected:     Stage(1 VU), Stage(10 VU), Stage(25 VU)...
```

### Step 3: Compute Per-Stage Metrics

For each detected stage, compute the median iteration duration from all `iteration_duration` points that fall within that stage's time window.

### Step 4: Calculate Ratios

Compare each stage's median to the baseline (first stage):

```
ratio = stage_median / baseline_median
```

### Step 5: Find the Knee

The knee is where the ratio first exceeds the multiplier threshold:
- **Last good stage** — highest VU where ratio ≤ multiplier
- **First bad stage** — lowest VU where ratio > multiplier
- **Interpolated estimate** — linear interpolation between good and bad

### Step 6: Estimate Real Users

```
real_user_multiplier = think_time / baseline_iteration_seconds
real_users = sweet_spot_vus × real_user_multiplier
```

---

## Output Format

### Terminal Output

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  CAPACITY PLANNING — Sweet Spot Analysis                                         ║
║  Threshold: 3× baseline | Baseline (1 VU): 1.6s                                 ║
║  Real user think time: 15s | 1 profiler VU ≈ 9 real users                        ║
╠══════════════════════════════════════════════════════════════════════════════════╣

  VUs  │ Iter Duration (median) │ Ratio  │ Status
───────┼────────────────────────┼────────┼─────────────────────
  1    │ 1.6s                   │ 1.0×   │ 🟢 ✓ within threshold
  10   │ 3.1s                   │ 1.9×   │ 🟢 ✓ within threshold
  17   │ 3.7s                   │ 2.3×   │ 🟢 ✓ within threshold
  18   │ 5.1s                   │ 3.2×   │ 🔴 ✗ exceeded
  25   │ 6.7s                   │ 4.1×   │ 🔴 ✗ exceeded
  100  │ 32.9s                  │ 20.4×  │ 🔴 ✗ exceeded

  [ASCII Chart]

── Result ──────────────────────────────────────────────────────────────────────
  Sweet Spot Range: 17–18 VUs
  Estimated Knee:   ~18 VUs
  Real User Equiv:  ~162 concurrent users (153–162 range)

  Interpretation:   System handles up to ~162 real concurrent users
                    assuming 15s think time between actions.
                    Latency stays within 3× baseline (4.8s).
╚══════════════════════════════════════════════════════════════════════════════════╝
```

### JSON Report

Saved to `*-capacity.json`:

```json
{
  "analysis": "capacity-sweet-spot",
  "multiplier": 3,
  "realUserThinkTime": 15,
  "realUserMultiplier": 9,
  "baseline": { "vus": 1, "medianMs": 1600 },
  "stages": [
    { "vus": 1, "medianMs": 1600, "p95Ms": 1800, "ratio": 1.0, "samples": 45, "withinThreshold": true, "estimatedRealUsers": 9 },
    { "vus": 10, "medianMs": 3100, "p95Ms": 4200, "ratio": 1.9, "samples": 120, "withinThreshold": true, "estimatedRealUsers": 90 },
    { "vus": 18, "medianMs": 5100, "p95Ms": 6800, "ratio": 3.2, "samples": 80, "withinThreshold": false, "estimatedRealUsers": 162 }
  ],
  "sweetSpot": {
    "rangeLow": 17,
    "rangeHigh": 18,
    "estimate": 18,
    "maxLatencyMs": 4800,
    "realUsersEstimate": 162,
    "realUsersRange": [153, 162]
  }
}
```

---

## VPS Sizing Workflow

### Goal

Find the cheapest VPS that handles your target concurrent user count within acceptable latency.

### Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Define target: "I need to support 200 concurrent users"  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Deploy to candidate VPS                                   │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Run profiler:                                             │
│    k6 run -e BASE_URL=http://vps-ip -e PROFILER_VUS=100     │
│    --out json=report.json k6/tests/endpoint-profiler.js      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Analyze:                                                  │
│    pnpm k6:analyze report.json --capacity --think-time=15    │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Check: Real User Equiv >= 200?                            │
│    YES → try cheaper VPS (save money)                        │
│    NO  → try bigger VPS (more capacity)                      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Repeat until you find the cheapest VPS that meets target  │
└─────────────────────────────────────────────────────────────┘
```

### Think Time Guidelines

| User Type | Think Time | Description |
|-----------|-----------|-------------|
| API consumers | 3-5s | Automated systems, mobile apps with prefetch |
| Power users | 8-12s | Staff using ERP daily, fast navigation |
| Normal users | 15-20s | Typical business users, reading + acting |
| Casual users | 25-30s | Occasional users, browsing dashboards |

Choose the think time that matches your primary user base.

### Example VPS Comparison

```bash
# Test on 2 vCPU / 4GB RAM VPS
k6 run -e BASE_URL=http://vps-small -e PROFILER_VUS=100 --out json=reports/vps-small.json ...
pnpm k6:analyze reports/vps-small.json --capacity
# Result: Sweet spot ~80 real users

# Test on 4 vCPU / 8GB RAM VPS
k6 run -e BASE_URL=http://vps-medium -e PROFILER_VUS=100 --out json=reports/vps-medium.json ...
pnpm k6:analyze reports/vps-medium.json --capacity
# Result: Sweet spot ~200 real users ← meets target!

# Test on 8 vCPU / 16GB RAM VPS
k6 run -e BASE_URL=http://vps-large -e PROFILER_VUS=200 --out json=reports/vps-large.json ...
pnpm k6:analyze reports/vps-large.json --capacity
# Result: Sweet spot ~450 real users ← overkill, save money
```

---

## Interpreting Results

### Healthy Degradation Curve

```
1× ────●────●────●
2× ─────────────────●────●
3× ─────────────────────────────●  ← knee here is good (gradual)
5× ──────────────────────────────────●
```

System scales linearly, then degrades gradually. Optimization is optional.

### Unhealthy Degradation Curve

```
1× ────●
2× ──────●
3× ────────●  ← knee too early
10× ─────────────●
20× ──────────────────●
```

System hits a wall quickly. Indicates a bottleneck (connection pool, single lock, memory limit). Needs architectural fix before scaling hardware.

### What Affects the Sweet Spot

| Factor | Impact on Sweet Spot |
|--------|---------------------|
| More CPU cores | ↑ Higher (more parallel request handling) |
| More RAM | ↑ Higher (more DB cache, less disk I/O) |
| Faster disk (NVMe) | ↑ Higher (faster queries) |
| DB connection pool size | ↑ Higher (more concurrent queries) |
| Unoptimized queries | ↓ Lower (each request takes longer) |
| Missing indexes | ↓ Lower (list queries scan full tables) |
| No caching | ↓ Lower (repeated expensive computations) |

---

## Limitations

1. **Think time is an estimate** — Real user behavior varies. The multiplier is approximate.
2. **Single-machine test** — Running k6 on the same machine as the backend adds CPU contention. For accurate VPS sizing, run k6 from a separate machine.
3. **Data volume matters** — Sweet spot decreases as database grows. Re-run periodically.
4. **Network latency not captured** — Local testing doesn't include network round-trip. Add 10-50ms for cloud deployments.
5. **Ramping granularity** — The profiler ramps through VU levels quickly. Some stages may have few samples. Use longer durations for more accurate results.

---

## Related Docs

- [Methodology](./METHODOLOGY.md) — Profiling approach and tier system
- [Reporting](./REPORTING.md) — Base report analyzer documentation
- [Configuration](./CONFIGURATION.md) — Environment variables and thresholds
- [Optimization Solutions](./OPTIMIZATION_SOLUTIONS.md) — How to improve the sweet spot

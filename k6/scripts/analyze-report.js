#!/usr/bin/env node
// k6/scripts/analyze-report.js
// Parses k6 JSON output and produces a terminal table + JSON report.
//
// Usage:
//   node k6/scripts/analyze-report.js k6/reports/profiler-test.json
//   node k6/scripts/analyze-report.js k6/reports/profiler-test.json --thresholds crud=300,list=800,workflow=2000

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ── Tier Thresholds ──────────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
	crud: { p95: 200, p99: 500 },
	list: { p95: 500, p99: 1000 },
	workflow: { p95: 1000, p99: 2000 },
};

// ── CLI Argument Parsing ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
let jsonFile = args.find((a) => !a.startsWith("--"));
const thresholdsArg = args.find((a) => a.startsWith("--thresholds="));
const capacityMode = args.includes("--capacity");
const capacityMultiplier = parseFloat((args.find((a) => a.startsWith("--multiplier=")) || "").replace("--multiplier=", "")) || 3.0;
const realUserThinkTime = parseFloat((args.find((a) => a.startsWith("--think-time=")) || "").replace("--think-time=", "")) || 15; // seconds between real user actions

let thresholds = { ...DEFAULT_THRESHOLDS };
if (thresholdsArg) {
	const parts = thresholdsArg.replace("--thresholds=", "").split(",");
	for (const part of parts) {
		const [tier, val] = part.split("=");
		if (thresholds[tier]) {
			thresholds[tier] = { p95: parseInt(val, 10), p99: parseInt(val, 10) * 2 };
		}
	}
}

// Auto-detect latest profiler report if no file argument provided
if (!jsonFile) {
	const reportsDir = path.join(__dirname, "..", "reports");
	if (fs.existsSync(reportsDir)) {
		const reports = fs.readdirSync(reportsDir)
			.filter((f) => /^profiler-\d{8}-\d{6}\.json$/.test(f))
			.sort()
			.reverse();
		if (reports.length > 0) {
			jsonFile = path.join(reportsDir, reports[0]);
			console.log(`Auto-detected latest report: ${jsonFile}`);
		}
	}
}

if (!jsonFile) {
	console.error("Usage: node analyze-report.js [path-to-k6-json-output] [--thresholds crud=300,list=800]");
	console.error("       If no file is provided, the latest report in k6/reports/ is used.");
	process.exit(1);
}

if (!fs.existsSync(jsonFile)) {
	console.error(`File not found: ${jsonFile}`);
	process.exit(1);
}

// ── Parse k6 JSON Output ──────────────────────────────────────────────────────
const metricPoints = [];
const httpRequests = [];
const vuPoints = [];           // {timestamp, value} for VU count over time
const iterDurationPoints = []; // {timestamp, value} for iteration duration
let testRunStart = null;
let testRunEnd = null;

const fileStream = fs.createReadStream(jsonFile, { encoding: "utf8" });
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineCount = 0;
rl.on("line", (line) => {
	lineCount++;
	if (!line.trim()) return;
	try {
		const entry = JSON.parse(line);

		if (entry.type === "Point" && entry.metric === "http_req_duration") {
			metricPoints.push(entry);
		}
		if (entry.type === "Point" && entry.metric === "http_req_failed") {
			metricPoints.push(entry);
		}
		if (entry.type === "Point" && entry.metric === "http_reqs") {
			metricPoints.push(entry);
		}
		if (entry.type === "Point" && entry.metric === "vus") {
			const ts = new Date(entry.data?.time || entry.timestamp).getTime();
			const val = entry.data?.value ?? entry.value ?? 0;
			if (!isNaN(ts)) vuPoints.push({ timestamp: ts, value: val });
		}
		if (entry.type === "Point" && entry.metric === "iteration_duration") {
			const ts = new Date(entry.data?.time || entry.timestamp).getTime();
			const val = entry.data?.value ?? entry.value ?? 0;
			if (!isNaN(ts)) iterDurationPoints.push({ timestamp: ts, value: val });
		}
		if (entry.type === "Run" && entry.metric === "http_req_duration") {
			// ignored — we use Point entries
		}

		// Track HTTP requests for error rate computation
		if (entry.type === "Point" && (entry.metric === "http_req_duration" || entry.metric === "http_req_failed")) {
			httpRequests.push(entry);
		}

		// Track time range
		const ts = new Date(entry.timestamp || entry.data?.time).getTime();
		if (!isNaN(ts)) {
			if (!testRunStart || ts < testRunStart) testRunStart = ts;
			if (!testRunEnd || ts > testRunEnd) testRunEnd = ts;
		}
	} catch (e) {
		// Skip malformed lines
	}
});

rl.on("close", () => {
	console.log(`\nParsed ${lineCount.toLocaleString()} lines, found ${metricPoints.length.toLocaleString()} metric points\n`);

	// ── Group by endpoint ───────────────────────────────────────────────────
	const endpointData = {};

	for (const point of metricPoints) {
		// k6 JSON format: entry.data has {value, time, tags}, or entry has top-level tags/value
		const tags = point.tags || point.data?.tags || {};
		const value = point.value ?? point.data?.value ?? 0;
		const endpoint = tags.endpoint || (tags.name && !tags.name.startsWith("http") ? tags.name : "unknown");
		const module = tags.module || "unknown";
		const tier = tags.tier || "crud";

		if (!endpointData[endpoint]) {
			endpointData[endpoint] = {
				endpoint,
				module,
				tier,
				durations: [],
				failures: 0,
				total: 0,
			};
		}

		if (point.metric === "http_req_duration") {
			endpointData[endpoint].durations.push(value);
			endpointData[endpoint].total++;
		}
		if (point.metric === "http_req_failed" && value >= 1) {
			endpointData[endpoint].failures++;
		}
	}

	// ── Compute Metrics ────────────────────────────────────────────────────
	const results = [];
	for (const [name, data] of Object.entries(endpointData)) {
		if (data.durations.length === 0) continue;

		const sorted = [...data.durations].sort((a, b) => a - b);
		const p50 = percentile(sorted, 0.5);
		const p95 = percentile(sorted, 0.95);
		const p99 = percentile(sorted, 0.99);
		const errorRate = data.total > 0 ? (data.failures / data.total) * 100 : 0;
		const runDurationSec = testRunStart && testRunEnd ? (testRunEnd - testRunStart) / 1000 : 1;
		const reqPerSec = data.total / runDurationSec;

		const threshold = thresholds[data.tier] || thresholds.crud;
		const flag = flagEndpoint(p95, threshold.p95);

		results.push({
			endpoint: data.endpoint,
			module: data.module,
			tier: data.tier,
			p50: Math.round(p50),
			p95: Math.round(p95),
			p99: Math.round(p99),
			errorRate: errorRate.toFixed(2),
			reqPerSec: reqPerSec.toFixed(1),
			total: data.total,
			flag,
			threshold: threshold.p95,
		});
	}

	// Sort by p95 descending (slowest first)
	results.sort((a, b) => b.p95 - a.p95);

	// ── Terminal Report ────────────────────────────────────────────────────
	const runDate = testRunStart ? new Date(testRunStart).toISOString() : "unknown";
	const duration = testRunStart && testRunEnd ? `${Math.round((testRunEnd - testRunStart) / 1000)}` : "unknown";

	console.log("╔══════════════════════════════════════════════════════════════════════════════════╗");
	console.log("║  GIMS ERP Endpoint Profiler Report                                               ║");
	console.log(`║  Run: ${runDate} | Duration: ${duration} | Endpoints: ${results.length}`);
	console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");
	console.log("║ Flag │ Module       │ Endpoint                       │ Tier     │ p50   │ p95   │ p99   │ Err% │ req/s ║");
	console.log("║──────┼──────────────┼────────────────────────────────┼──────────┼───────┼───────┼───────┼──────┼───────║");

	for (const r of results) {
		const flagStr = r.flag === "green" ? "🟢" : r.flag === "yellow" ? "🟡" : "🔴";
		const p50Str = r.p50 >= 1000 ? (r.p50 / 1000).toFixed(1) + "s" : r.p50 + "ms";
		const p95Str = r.p95 >= 1000 ? (r.p95 / 1000).toFixed(1) + "s" : r.p95 + "ms";
		const p99Str = r.p99 >= 1000 ? (r.p99 / 1000).toFixed(1) + "s" : r.p99 + "ms";
		const row = `║ ${flagStr}  │ ${pad(r.module, 12)} │ ${pad(truncName(r.endpoint), 30)} │ ${pad(r.tier, 8)} │ ${pad(p50Str, 6)} │ ${pad(p95Str, 6)} │ ${pad(p99Str, 6)} │ ${pad(r.errorRate + "%", 4)} │ ${pad(r.reqPerSec, 5)} ║`;
		console.log(row);
	}

	console.log("╚══════════════════════════════════════════════════════════════════════════════════╝");

	// ── Module Summary ─────────────────────────────────────────────────────
	const moduleSummary = {};
	for (const r of results) {
		if (!moduleSummary[r.module]) {
			moduleSummary[r.module] = { endpoints: 0, totalP95: 0, totalErrors: 0, flags: { green: 0, yellow: 0, red: 0 } };
		}
		moduleSummary[r.module].endpoints++;
		moduleSummary[r.module].totalP95 += r.p95;
		moduleSummary[r.module].totalErrors += parseFloat(r.errorRate);
		moduleSummary[r.module].flags[r.flag]++;
	}

	console.log("\n── Module Summary ──────────────────────────────────────────────────────────────");
	console.log("Module          │ Endpoints │ Avg p95  │ Err%   │ 🟢  │ 🟡  │ 🔴");
	console.log("────────────────┼───────────┼──────────┼────────┼─────┼─────┼────");
	for (const [mod, data] of Object.entries(moduleSummary).sort((a, b) => b[1].totalP95 / b[1].endpoints - a[1].totalP95 / a[1].endpoints)) {
		const avgP95 = Math.round(data.totalP95 / data.endpoints);
		const avgErr = (data.totalErrors / data.endpoints).toFixed(2);
		console.log(`${pad(mod, 15)} │ ${pad(data.endpoints, 9)} │ ${pad(avgP95 + "ms", 8)} │ ${pad(avgErr + "%", 6)} │ ${pad(data.flags.green, 3)} │ ${pad(data.flags.yellow, 3)} │ ${pad(data.flags.red, 3)}`);
	}

	// ── JSON Report ────────────────────────────────────────────────────────
	const reportPath = jsonFile.replace(/\.json$/, "-analyzed.json");
	const report = {
		metadata: {
			runDate,
			duration: `${duration}s`,
			totalEndpoints: results.length,
			thresholds,
		},
		endpoints: results,
		moduleSummary: Object.fromEntries(
			Object.entries(moduleSummary).map(([mod, data]) => [
				mod,
				{
					...data,
					avgP95: Math.round(data.totalP95 / data.endpoints),
				},
			])
		),
	};

	fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
	console.log(`\n📄 JSON report saved to: ${reportPath}`);

	// ── Capacity Analysis (--capacity flag) ───────────────────────────────────
	if (capacityMode) {
		runCapacityAnalysis(vuPoints, iterDurationPoints, capacityMultiplier, realUserThinkTime, jsonFile);
	}
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function percentile(sorted, p) {
	if (sorted.length === 0) return 0;
	const idx = Math.ceil(sorted.length * p) - 1;
	return sorted[Math.max(0, idx)];
}

function flagEndpoint(p95, threshold) {
	if (p95 <= threshold) return "green";
	if (p95 <= threshold * 2) return "yellow";
	return "red";
}

function pad(str, len) {
	const s = String(str);
	if (s.length >= len) return s.substring(0, len);
	return s + " ".repeat(len - s.length);
}

function truncName(name, maxLen = 30) {
	if (name.length <= maxLen) return name;
	return name.substring(0, maxLen - 2) + "..";
}

// ── Capacity Analysis ─────────────────────────────────────────────────────────
function runCapacityAnalysis(vuPoints, iterDurationPoints, multiplier, thinkTime, jsonFile) {
	if (vuPoints.length === 0 || iterDurationPoints.length === 0) {
		console.error("\n⚠️  Capacity analysis requires VU and iteration_duration data. Run with --out json to capture these metrics.");
		return;
	}

	// Sort by timestamp
	vuPoints.sort((a, b) => a.timestamp - b.timestamp);
	iterDurationPoints.sort((a, b) => a.timestamp - b.timestamp);

	// Determine VU stages by finding stable VU levels
	const vuLevels = detectVUStages(vuPoints);
	if (vuLevels.length < 2) {
		console.error("\n⚠️  Not enough VU stages detected for capacity analysis.");
		return;
	}

	// Assign each iteration_duration point to a VU level
	const stageData = [];
	for (const stage of vuLevels) {
		const points = iterDurationPoints.filter(
			(p) => p.timestamp >= stage.start && p.timestamp <= stage.end
		);
		if (points.length < 3) continue; // need minimum samples
		const durations = points.map((p) => p.value).sort((a, b) => a - b);
		const median = percentile(durations, 0.5);
		const p95 = percentile(durations, 0.95);
		stageData.push({
			vus: stage.vus,
			median: Math.round(median),
			p95: Math.round(p95),
			samples: points.length,
			start: stage.start,
			end: stage.end,
		});
	}

	if (stageData.length < 2) {
		console.error("\n⚠️  Not enough stage data for capacity analysis.");
		return;
	}

	// Baseline = first stage (lowest VU count)
	const baseline = stageData[0];
	const baselineMs = baseline.median;

	// Compute ratio for each stage
	for (const stage of stageData) {
		stage.ratio = stage.median / baselineMs;
	}

	// Find the knee: last stage where ratio < multiplier
	let lastGoodIdx = 0;
	let firstBadIdx = -1;
	for (let i = 0; i < stageData.length; i++) {
		if (stageData[i].ratio <= multiplier) {
			lastGoodIdx = i;
		} else if (firstBadIdx === -1) {
			firstBadIdx = i;
		}
	}

	// Interpolate sweet spot
	let sweetSpotEstimate = stageData[stageData.length - 1].vus;
	let sweetSpotLow = stageData[lastGoodIdx].vus;
	let sweetSpotHigh = null;

	if (firstBadIdx > 0) {
		const good = stageData[firstBadIdx - 1];
		const bad = stageData[firstBadIdx];
		sweetSpotHigh = bad.vus;
		sweetSpotLow = good.vus;
		// Linear interpolation: find VU where ratio = multiplier
		const ratioRange = bad.ratio - good.ratio;
		const vuRange = bad.vus - good.vus;
		if (ratioRange > 0) {
			const fraction = (multiplier - good.ratio) / ratioRange;
			sweetSpotEstimate = Math.round(good.vus + fraction * vuRange);
		}
	} else {
		// All stages are within threshold
		sweetSpotEstimate = stageData[stageData.length - 1].vus;
		sweetSpotHigh = null;
	}

	// Real user multiplier: profiler VU has ~0.5-1s think time, real user has thinkTime seconds
	// Formula: realUsers = VUs × (thinkTime / baselineIterationSeconds)
	const baselineSec = baselineMs / 1000;
	const realUserMultiplier = Math.round(thinkTime / baselineSec);

	// ── Terminal Output ──────────────────────────────────────────────────────
	console.log("\n");
	console.log("╔══════════════════════════════════════════════════════════════════════════════════╗");
	console.log("║  CAPACITY PLANNING — Sweet Spot Analysis                                         ║");
	console.log(`║  Threshold: ${multiplier}× baseline | Baseline (${baseline.vus} VU): ${formatMs(baselineMs)}${" ".repeat(30)}║`);
	console.log(`║  Real user think time: ${thinkTime}s | 1 profiler VU ≈ ${realUserMultiplier} real users${" ".repeat(24)}║`);
	console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");
	console.log("");

	// Stage breakdown
	console.log("  VUs  │ Iter Duration (median) │ Ratio  │ Status");
	console.log("───────┼────────────────────────┼────────┼─────────────────────");
	for (const stage of stageData) {
		const status = stage.ratio <= multiplier ? "✓ within threshold" : "✗ exceeded";
		const flag = stage.ratio <= multiplier ? "🟢" : "🔴";
		console.log(
			`  ${pad(stage.vus, 4)} │ ${pad(formatMs(stage.median), 22)} │ ${pad(stage.ratio.toFixed(1) + "×", 6)} │ ${flag} ${status}`
		);
	}

	// ASCII Chart
	console.log("");
	renderASCIIChart(stageData, baselineMs, multiplier);

	// Sweet spot result
	console.log("");
	console.log("── Result ──────────────────────────────────────────────────────────────────────");
	if (sweetSpotHigh) {
		const realUsersLow = sweetSpotLow * realUserMultiplier;
		const realUsersHigh = sweetSpotHigh * realUserMultiplier;
		const realUsersEstimate = sweetSpotEstimate * realUserMultiplier;
		console.log(`  Sweet Spot Range: ${sweetSpotLow}–${sweetSpotHigh} VUs`);
		console.log(`  Estimated Knee:   ~${sweetSpotEstimate} VUs`);
		console.log(`  Real User Equiv:  ~${realUsersEstimate} concurrent users (${realUsersLow}–${realUsersHigh} range)`);
		console.log(``);
		console.log(`  Interpretation:   System handles up to ~${realUsersEstimate} real concurrent users`);
		console.log(`                    assuming ${thinkTime}s think time between actions.`);
		console.log(`                    Latency stays within ${multiplier}× baseline (${formatMs(baselineMs * multiplier)}).`);
	} else {
		const realUsersLow = sweetSpotLow * realUserMultiplier;
		console.log(`  Sweet Spot: > ${sweetSpotLow} VUs (all stages within ${multiplier}× baseline)`);
		console.log(`  Real User Equiv:  > ${realUsersLow} concurrent users`);
		console.log(`  Interpretation:   System handles ${realUsersLow}+ concurrent users comfortably.`);
		console.log(`                    Run with higher VUs to find the actual ceiling.`);
	}
	console.log("");
	console.log("╚══════════════════════════════════════════════════════════════════════════════════╝");

	// ── JSON Output ─────────────────────────────────────────────────────────
	const capacityReport = {
		analysis: "capacity-sweet-spot",
		multiplier,
		realUserThinkTime: thinkTime,
		realUserMultiplier,
		baseline: { vus: baseline.vus, medianMs: baselineMs },
		stages: stageData.map((s) => ({
			vus: s.vus,
			medianMs: s.median,
			p95Ms: s.p95,
			ratio: parseFloat(s.ratio.toFixed(2)),
			samples: s.samples,
			withinThreshold: s.ratio <= multiplier,
			estimatedRealUsers: s.vus * realUserMultiplier,
		})),
		sweetSpot: {
			rangeLow: sweetSpotLow,
			rangeHigh: sweetSpotHigh,
			estimate: sweetSpotEstimate,
			maxLatencyMs: Math.round(baselineMs * multiplier),
			realUsersEstimate: sweetSpotEstimate * realUserMultiplier,
			realUsersRange: sweetSpotHigh
				? [sweetSpotLow * realUserMultiplier, sweetSpotHigh * realUserMultiplier]
				: [sweetSpotLow * realUserMultiplier, null],
		},
	};

	const capacityPath = jsonFile.replace(/\.json$/, "-capacity.json");
	fs.writeFileSync(capacityPath, JSON.stringify(capacityReport, null, 2));
	console.log(`📄 Capacity report saved to: ${capacityPath}`);
}

// ── VU Stage Detection ────────────────────────────────────────────────────────
function detectVUStages(vuPoints) {
	if (vuPoints.length === 0) return [];

	const stages = [];
	let currentVU = Math.round(vuPoints[0].value);
	let stageStart = vuPoints[0].timestamp;
	let stableCount = 0;
	const STABILITY_THRESHOLD = 3; // need 3+ consecutive same-VU points

	for (let i = 1; i < vuPoints.length; i++) {
		const vu = Math.round(vuPoints[i].value);
		if (vu === currentVU) {
			stableCount++;
		} else {
			// VU level changed — record previous stage if stable enough
			if (stableCount >= STABILITY_THRESHOLD && currentVU > 0) {
				stages.push({
					vus: currentVU,
					start: stageStart,
					end: vuPoints[i - 1].timestamp,
				});
			}
			currentVU = vu;
			stageStart = vuPoints[i].timestamp;
			stableCount = 0;
		}
	}

	// Record final stage
	if (stableCount >= STABILITY_THRESHOLD && currentVU > 0) {
		stages.push({
			vus: currentVU,
			start: stageStart,
			end: vuPoints[vuPoints.length - 1].timestamp,
		});
	}

	// Deduplicate: if same VU level appears multiple times, merge
	const merged = [];
	for (const stage of stages) {
		const existing = merged.find((s) => s.vus === stage.vus);
		if (existing) {
			existing.end = Math.max(existing.end, stage.end);
			existing.start = Math.min(existing.start, stage.start);
		} else {
			merged.push({ ...stage });
		}
	}

	// Sort by VU count ascending
	merged.sort((a, b) => a.vus - b.vus);
	return merged;
}

// ── ASCII Chart Renderer ──────────────────────────────────────────────────────
function renderASCIIChart(stageData, baselineMs, multiplier) {
	const chartHeight = 10;
	const chartWidth = 60;
	const thresholdMs = baselineMs * multiplier;

	// Find max duration for scaling
	const maxDuration = Math.max(...stageData.map((s) => s.median), thresholdMs * 1.2);

	console.log("  Iteration Duration vs Load");
	console.log("");

	// Render rows top to bottom
	for (let row = chartHeight; row >= 0; row--) {
		const rowValue = (row / chartHeight) * maxDuration;
		const label = row === chartHeight ? formatMs(Math.round(maxDuration)) :
			row === 0 ? "0" :
			row === Math.round((thresholdMs / maxDuration) * chartHeight) ? formatMs(Math.round(thresholdMs)) + " ┄" :
			"";

		let line = "  " + pad(label, 8) + "┤";

		// Plot data points
		const colWidth = Math.floor(chartWidth / stageData.length);
		for (let col = 0; col < stageData.length; col++) {
			const stage = stageData[col];
			const stageRow = Math.round((stage.median / maxDuration) * chartHeight);
			const center = Math.floor(colWidth / 2);

			let segment = " ".repeat(colWidth);
			if (stageRow === row) {
				const marker = stage.ratio <= multiplier ? "●" : "✗";
				segment = " ".repeat(center) + marker + " ".repeat(colWidth - center - 1);
			} else if (row === Math.round((thresholdMs / maxDuration) * chartHeight) && !label.includes("┄")) {
				segment = "┄".repeat(colWidth);
			}
			line += segment;
		}

		console.log(line);
	}

	// X-axis
	const colWidth = Math.floor(chartWidth / stageData.length);
	let xAxis = "  " + " ".repeat(8) + "└";
	let xLabels = "  " + " ".repeat(9);
	for (const stage of stageData) {
		xAxis += "─".repeat(colWidth);
		const lbl = stage.vus + " VUs";
		xLabels += pad(lbl, colWidth);
	}
	console.log(xAxis);
	console.log(xLabels);

	// Legend
	console.log("");
	console.log(`  ● = within ${multiplier}× baseline  ┄ = ${multiplier}× threshold (${formatMs(Math.round(thresholdMs))})  ✗ = exceeded`);
}

function formatMs(ms) {
	if (ms >= 60000) return (ms / 60000).toFixed(1) + "m";
	if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
	return ms + "ms";
}
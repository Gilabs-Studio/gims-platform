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
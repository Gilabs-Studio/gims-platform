const fs = require('fs');
const path = require('path');

const ts = '20260512-012329';
const dir = path.join('k6', 'reports');

const stages = [
  { key: 'smoke', file: `${ts}-smoke.json`, gate: { p95: 500, p99: 1000, err: 0.01 } },
  { key: 'load-baseline', file: `${ts}-load-baseline.json`, gate: { p95: 500, p99: 1000, err: 0.01 } },
  { key: 'load-peak', file: `${ts}-load-peak.json`, gate: { p95: 500, p99: 1000, err: 0.01 } },
  { key: 'stress-quick', file: `${ts}-stress-quick.json`, gate: { p95: 1000, p99: 2000, err: 0.01 } },
  { key: 'stress-full', file: `${ts}-stress-full.json`, gate: { p95: 1000, p99: 2000, err: 0.01 } },
  { key: 'soak', file: `${ts}-soak.json`, gate: { p95: 500, p99: 1000, err: 0.01 } },
];

function getMetric(metrics, name, key, fallback = null) {
  if (!metrics[name]) return fallback;
  if (Object.prototype.hasOwnProperty.call(metrics[name], key)) return metrics[name][key];
  return fallback;
}

const rows = [];
for (const stage of stages) {
  const filePath = path.join(dir, stage.file);
  if (!fs.existsSync(filePath)) {
    rows.push({ stage: stage.key, missing: true });
    continue;
  }

  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const metrics = json.metrics || {};

  const p95 = getMetric(metrics, 'http_req_duration', 'p(95)', 0);
  const p99 = getMetric(metrics, 'http_req_duration', 'p(99)', null);
  const errorRate = getMetric(metrics, 'http_req_failed', 'value', 0);
  const requests = getMetric(metrics, 'http_reqs', 'count', 0);
  const rps = getMetric(metrics, 'http_reqs', 'rate', 0);
  const checksPass = getMetric(metrics, 'checks', 'passes', 0);
  const checksFail = getMetric(metrics, 'checks', 'fails', 0);
  const vusMax = getMetric(metrics, 'vus_max', 'value', 0);

  const p99Pass = p99 === null ? true : p99 < stage.gate.p99;
  const pass =
    errorRate < stage.gate.err &&
    p95 < stage.gate.p95 &&
    p99Pass;

  rows.push({
    stage: stage.key,
    missing: false,
    p95,
    p99,
    errorRate,
    requests,
    rps,
    checksPass,
    checksFail,
    vusMax,
    pass,
  });
}

const fmtMs = (value) => (value === null ? 'N/A' : `${Number(value || 0).toFixed(2)}ms`);
const fmtPct = (value) => `${(Number(value || 0) * 100).toFixed(4)}%`;
const fmtInt = (value) => `${Number(value || 0).toLocaleString('en-US')}`;
const fmtRps = (value) => `${Number(value || 0).toFixed(2)}`;

const totalStages = rows.filter((row) => !row.missing).length;
const passedStages = rows.filter((row) => !row.missing && row.pass).length;

const notes = [];
const peak = rows.find((row) => row.stage === 'load-peak' && !row.missing);
if (peak && peak.checksFail > 0) {
  notes.push(`- load-peak had ${peak.checksFail} failed check(s) on optional create-path assertions.`);
}
const full = rows.find((row) => row.stage === 'stress-full' && !row.missing);
if (full && full.vusMax <= 20) {
  notes.push(`- stress-full ran in compressed profile (max VUs ${full.vusMax}); treat as first-pass stress proxy.`);
}

let report = '';
report += `# k6 Baseline Report (${ts})\n\n`;
report += `Generated: 2026-05-12\n\n`;
report += `## Sequence Summary\n\n`;
report += `- Stages completed: ${totalStages}/6\n`;
report += `- Stage gates passed: ${passedStages}/${totalStages}\n\n`;
report += `## Stage Metrics\n\n`;
report += `| Stage | Gate | p95 | p99 | Error Rate | Requests | Req/s | Checks (pass/fail) | Max VUs |\n`;
report += `| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;

for (const row of rows) {
  if (row.missing) {
    report += `| ${row.stage} | MISSING | - | - | - | - | - | - | - |\n`;
    continue;
  }

  report += `| ${row.stage} | ${row.pass ? 'PASS' : 'FAIL'} | ${fmtMs(row.p95)} | ${fmtMs(row.p99)} | ${fmtPct(row.errorRate)} | ${fmtInt(row.requests)} | ${fmtRps(row.rps)} | ${fmtInt(row.checksPass)}/${fmtInt(row.checksFail)} | ${fmtInt(row.vusMax)} |\n`;
}

report += `\n## Notes\n\n`;
if (notes.length === 0) {
  report += `- No additional caveats recorded for this run.\n`;
} else {
  report += `${notes.join('\n')}\n`;
}

report += `\n## Artifacts\n\n`;
for (const stage of stages) {
  report += `- ${path.join('k6', 'reports', stage.file)}\n`;
}

const output = path.join(dir, `${ts}-baseline-report.md`);
fs.writeFileSync(output, report);
console.log(`Wrote ${output}`);

#!/usr/bin/env node
// k6/scripts/seed-persist.js
// Node.js wrapper that runs the k6 seed resolver and persists seed-state.json.
//
// The k6 seed script (seed.js) resolves entities in setup() and emits the JSON
// state to stdout between __SEED_STATE_BEGIN__ / __SEED_STATE_END__ delimiters.
// This wrapper captures that output, strips k6's log wrappers, parses the JSON,
// enriches it with metadata, and writes k6/data/generated/seed-state.json.
//
// Usage:
//   node k6/scripts/seed-persist.js
//   node k6/scripts/seed-persist.js --env=staging --base-url=https://staging.gims.app
//   node k6/scripts/seed-persist.js --dry-run

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── CLI Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const envArg = args.find(a => a.startsWith('--env='));
const baseUrlArg = args.find(a => a.startsWith('--base-url='));
const k6Env = envArg ? envArg.replace('--env=', '') : (process.env.K6_ENV || 'local');
const baseUrl = baseUrlArg ? baseUrlArg.replace('--base-url=', '') : (process.env.BASE_URL || 'http://localhost:8081');

// ── Paths ────────────────────────────────────────────────────────────────────
const rootDir = path.resolve(__dirname, '..', '..');
const k6Dir = path.resolve(__dirname, '..');
const outputDir = path.join(k6Dir, 'data', 'generated');
const outputFile = path.join(outputDir, 'seed-state.json');
const seedScript = path.join(k6Dir, 'scripts', 'seed.js');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ── Run k6 seed resolver ─────────────────────────────────────────────────────
console.log(`[seed-persist] Environment: ${k6Env}`);
console.log(`[seed-persist] Base URL: ${baseUrl}`);
console.log(`[seed-persist] Dry run: ${dryRun}\n`);

const envVars = [
  `-e K6_ENV=${k6Env}`,
  `-e BASE_URL=${baseUrl}`,
  dryRun ? '-e SEED_DRY_RUN=true' : '',
].filter(Boolean).join(' ');

const cmd = `k6 run ${envVars} "${seedScript}"`;
console.log(`[seed-persist] Running: ${cmd}\n`);

let output = '';
try {
  // k6 writes console.log() to stderr; redirect 2>&1 so we capture the markers.
  output = execSync(`${cmd} 2>&1`, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, K6_ENV: k6Env, BASE_URL: baseUrl },
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  output = (e.stdout || '') + '\n' + (e.stderr || '');
}

// ── Extract the delimited JSON ───────────────────────────────────────────────
// k6 may wrap console output as: level=info msg="__SEED_STATE_BEGIN__{...}__SEED_STATE_END__"
// and may escape quotes. Normalize before extracting.
const beginMark = '__SEED_STATE_BEGIN__';
const endMark = '__SEED_STATE_END__';

const beginIdx = output.indexOf(beginMark);
const endIdx = output.indexOf(endMark);

if (beginIdx === -1 || endIdx === -1) {
  console.error('[seed-persist] ✗ Could not find seed state markers in k6 output.');
  console.error('[seed-persist] Output tail:\n' + output.slice(-1500));
  process.exit(1);
}

let jsonStr = output.substring(beginIdx + beginMark.length, endIdx);

// k6 log wrapping escapes double quotes as \" and may collapse newlines.
// Undo common escaping so JSON.parse succeeds.
jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();

let seedState;
try {
  seedState = JSON.parse(jsonStr);
} catch (e) {
  console.error(`[seed-persist] ✗ Failed to parse seed state JSON: ${e.message}`);
  console.error('[seed-persist] Raw extracted:\n' + jsonStr.slice(0, 1500));
  process.exit(1);
}

// The k6 setup() return is the state. Drop the auth object if present.
delete seedState.auth;

if (dryRun) {
  console.log('[seed-persist] DRY RUN — resolved state (not written):');
  console.log(JSON.stringify(seedState, null, 2));
  process.exit(0);
}

// ── Enrich + write ───────────────────────────────────────────────────────────
const enriched = {
  _meta: {
    generatedAt: new Date().toISOString(),
    environment: k6Env,
    baseUrl,
  },
  ...seedState,
};

fs.writeFileSync(outputFile, JSON.stringify(enriched, null, 2));

const entities = Object.keys(seedState);
const resolved = entities.filter(k => seedState[k] !== null);
const missing = entities.filter(k => seedState[k] === null);

console.log(`[seed-persist] ✓ Seed state written to: ${outputFile}`);
console.log(`[seed-persist] Resolved: ${resolved.length}/${entities.length} (${resolved.join(', ')})`);
if (missing.length > 0) {
  console.log(`[seed-persist] ⚠ Missing: ${missing.join(', ')}`);
}

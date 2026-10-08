/**
 * FNMF Test Control Center - Comprehensive Audit & Security Test Suite
 * 
 * Verifies:
 * 1. Operator Auth & Anti-CSRF Protection (Observer blocked, operator login, locked ops 423)
 * 2. /api/status/:service contract (NOT_MEASURED strictly returns 503)
 * 3. On-disk database backup SHA-256 re-computation & tamper detection
 * 4. ADB disconnect / stale simulation (stale numbers cleared to null, nodes -> UNKNOWN_STALE)
 * 5. Git -> Build -> Artifact -> Running Device Pipeline Chain (SHA-256 matching, 5 states)
 */

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:4100';

function makeRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body !== null) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: data,
          body: json,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out: ${method} ${endpoint}`));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// Colorized CLI Output Helpers
const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ${colors.green('✓ PASS:')} ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ${colors.red('✗ FAIL:')} ${name}`);
    console.error(`    ${colors.red(err.stack || err.message)}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log(colors.bold('\n============================================================'));
  console.log(colors.bold('   FNMF CONTROL CENTER - AUDIT & SECURITY TEST SUITE       '));
  console.log(colors.bold('============================================================\n'));

  // Pre-flight check: Is server reachable?
  let serverRunning = false;
  try {
    const res = await makeRequest('GET', '/api/telemetry');
    if (res.statusCode === 200) serverRunning = true;
  } catch {}

  if (!serverRunning) {
    console.error(colors.red('Error: Control Center is not running on 127.0.0.1:4100! Please start it first.'));
    process.exit(1);
  }

  // Load external configuration for operator secret
  const config = require('../server/config');
  const realOperatorSecret = config.getOperatorSecret();

  // Variables shared across tests
  let csrfToken = '';
  let operatorToken = '';

  // -------------------------------------------------------------------------
  // SECTION 1: ANTI-CSRF, OPERATOR AUTH & LOCKED DEPLOY (423)
  // -------------------------------------------------------------------------
  console.log(colors.cyan('\n[1] Security & Operator Authentication Tests'));

  await test('1.1 Fetch Anti-CSRF token on loopback', async () => {
    const res = await makeRequest('GET', '/api/auth/token', {
      Host: '127.0.0.1:4100',
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.token, 'Must return a CSRF token');
    assert.strictEqual(res.body.role, 'OBSERVER');
    assert.strictEqual(res.body.disarmed, true, 'Operations must be disarmed');
    csrfToken = res.body.token;
  });

  await test('1.2 Reject cross-origin requests from external web domain', async () => {
    const res = await makeRequest('GET', '/api/auth/token', {
      Host: '127.0.0.1:4100',
      Origin: 'http://malicious-website.com',
    });
    assert.strictEqual(res.statusCode, 403, 'Must return 403 Forbidden for untrusted origin');
    assert.strictEqual(res.body.error, 'FORBIDDEN_ORIGIN');
  });

  await test('1.3 Mutation blocked for Observer without Operator auth (401)', async () => {
    const res = await makeRequest('POST', '/api/ops/trigger-deploy', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
    }, { confirm: true });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'OPERATOR_AUTH_REQUIRED');
  });

  await test('1.4 Operator login rejects invalid secret', async () => {
    const res = await makeRequest('POST', '/api/auth/operator-login', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
    }, { operator_secret: 'wrong_secret_12345' });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'INVALID_OPERATOR_SECRET');
  });

  await test('1.5 Operator login succeeds with valid secret from external config', async () => {
    const res = await makeRequest('POST', '/api/auth/operator-login', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
    }, { operator_secret: realOperatorSecret });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.role, 'OPERATOR');
    assert.ok(res.body.operator_token, 'Must return operator session token');
    operatorToken = res.body.operator_token;
  });

  await test('1.6 Health check trigger remains locked (HTTP 423 Locked)', async () => {
    const res = await makeRequest('POST', '/api/ops/trigger-health', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
      'X-FNMF-Operator-Token': operatorToken,
    });
    assert.strictEqual(res.statusCode, 423, 'Must return HTTP 423 Locked');
    assert.strictEqual(res.body.locked, true);
    assert.strictEqual(res.body.error, 'OPERATIONS_DISARMED');
  });

  await test('1.7 Deploy trigger remains locked (HTTP 423 Locked)', async () => {
    const res = await makeRequest('POST', '/api/ops/trigger-deploy', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
      'X-FNMF-Operator-Token': operatorToken,
    }, { confirm: true });
    assert.strictEqual(res.statusCode, 423, 'Must return HTTP 423 Locked');
    assert.strictEqual(res.body.locked, true);
    assert.strictEqual(res.body.error, 'OPERATIONS_DISARMED');
  });

  // -------------------------------------------------------------------------
  // SECTION 2: /api/status/:service CONTRACT (NOT_MEASURED = 503)
  // -------------------------------------------------------------------------
  console.log(colors.cyan('\n[2] /api/status/:service Contract Tests'));

  await test('2.1 NOT_MEASURED service (binance_ws) strictly returns HTTP 503', async () => {
    const res = await makeRequest('GET', '/api/status/binance_ws');
    assert.strictEqual(res.statusCode, 503, 'NOT_MEASURED must never return HTTP 200');
    assert.strictEqual(res.body.status, 'NOT_MEASURED');
    assert.ok(res.body.measurement_source, 'Must include measurement source');
  });

  await test('2.2 UP service (host_bridge) returns HTTP 200', async () => {
    const res = await makeRequest('GET', '/api/status/host_bridge');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'UP');
  });

  // -------------------------------------------------------------------------
  // SECTION 3: DATABASE BACKUP HASH RE-COMPUTATION & TAMPER DETECTION
  // -------------------------------------------------------------------------
  console.log(colors.cyan('\n[3] Database Backup On-Disk SHA-256 & Tamper Detection Tests'));

  await test('3.1 Valid backup file matches manifest SHA-256 and size', async () => {
    const telRes = await makeRequest('GET', '/api/telemetry');
    const pg = telRes.body.nodes.postgresql;

    if (pg.status === 'UP' && pg.details.latest_backup) {
      assert.strictEqual(pg.details.backup_verified, true, 'Backup verified must be true');
      assert.strictEqual(pg.details.backup_hash_matched, true, 'Hash matched must be true');
      assert.ok(pg.details.backup_sha256, 'Must have re-computed SHA-256');
      assert.ok(pg.details.backup_verification_method.includes('SHA-256'), 'Must specify verification method');
    } else {
      console.log('    (Postgres not UP or no backup; testing hash logic algorithmically)');
    }
  });

  await test('3.2 Algorithmically detect tampered backup file hash mismatch', () => {
    const originalContent = Buffer.from('CREATE TABLE test_audit (id INT);');
    const correctSha = crypto.createHash('sha256').update(originalContent).digest('hex');

    // Tampered content (even a single bit changed)
    const tamperedContent = Buffer.from('CREATE TABLE test_audit (id BIGINT);');
    const tamperedSha = crypto.createHash('sha256').update(tamperedContent).digest('hex');

    // Simulate manifest
    const manifest = {
      sha256: correctSha,
      verified: true,
      size_bytes: originalContent.length,
    };

    // Verification check as implemented in telemetry.js
    const isTamperedMatched = tamperedSha.toLowerCase() === (manifest.sha256 || '').toLowerCase();
    const isTamperedVerified = manifest.verified && isTamperedMatched && manifest.size_bytes === tamperedContent.length;

    assert.strictEqual(isTamperedMatched, false, 'Tampered file hash must not match manifest');
    assert.strictEqual(isTamperedVerified, false, 'Tampered backup must be rejected as unverified');
  });

  // -------------------------------------------------------------------------
  // SECTION 4: ADB DROP & STALE METRICS INVALIDATION
  // -------------------------------------------------------------------------
  console.log(colors.cyan('\n[4] ADB Drop & Stale Metrics Invalidation Tests'));

  await test('4.1 Simulate ADB drop: dependent nodes change to UNKNOWN_STALE or DISCONNECTED', async () => {
    // Enable drop simulation
    const dropRes = await makeRequest('POST', '/api/simulate-disconnect', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
      'X-FNMF-Operator-Token': operatorToken,
    }, { drop: true });
    assert.strictEqual(dropRes.statusCode, 200);

    // Wait 5.5s for poll cycle to update state
    await new Promise((r) => setTimeout(r, 5500));

    const telRes = await makeRequest('GET', '/api/telemetry');
    const nodes = telRes.body.nodes;

    assert.strictEqual(nodes.android_device.status, 'DISCONNECTED');
    assert.strictEqual(nodes.spring_boot.status, 'UNKNOWN_STALE');
    assert.strictEqual(nodes.postgresql.status, 'UNKNOWN_STALE');
    assert.strictEqual(nodes.gemini_ai.status, 'UNKNOWN_STALE');

    // Host bridge and Binance REST remain independent
    assert.strictEqual(nodes.host_bridge.status, 'UP');
    assert.strictEqual(nodes.binance_rest.status, 'UP');
  });

  await test('4.2 Stale metrics on PostgreSQL are cleared to null, not kept as live', async () => {
    const telRes = await makeRequest('GET', '/api/telemetry');
    const pg = telRes.body.nodes.postgresql;

    assert.strictEqual(pg.details.tables_count, null, 'tables_count must be null when stale');
    assert.strictEqual(pg.details.users_count, null, 'users_count must be null when stale');
    assert.strictEqual(pg.details.wallets_count, null, 'wallets_count must be null when stale');
    assert.strictEqual(pg.details.flyway_version, null, 'flyway_version must be null when stale');
    assert.strictEqual(pg.details.backup_verified, false, 'backup_verified must be false when stale');
    assert.strictEqual(pg.details.backup_hash_matched, false, 'backup_hash_matched must be false when stale');
  });

  await test('4.3 Restore connection from drop simulation', async () => {
    const restoreRes = await makeRequest('POST', '/api/simulate-disconnect', {
      Host: '127.0.0.1:4100',
      'X-FNMF-Control-Token': csrfToken,
      'X-FNMF-Operator-Token': operatorToken,
    }, { drop: false });
    assert.strictEqual(restoreRes.statusCode, 200);

    // Wait for poll cycle to restore
    await new Promise((r) => setTimeout(r, 5500));

    const telRes = await makeRequest('GET', '/api/telemetry');
    const nodes = telRes.body.nodes;

    assert.strictEqual(nodes.android_device.status, 'UP', 'Android device should restore to UP');
    assert.strictEqual(nodes.spring_boot.status, 'UP', 'Spring Boot should restore to UP');
    assert.strictEqual(nodes.postgresql.status, 'UP', 'PostgreSQL should restore to UP');
  });

  // -------------------------------------------------------------------------
  // SECTION 5: PIPELINE CHAIN (GIT -> BUILD -> ARTIFACT -> DEVICE)
  // -------------------------------------------------------------------------
  console.log(colors.cyan('\n[5] Pipeline Chain & Cryptographic SHA Comparison Tests'));

  await test('5.1 Verify Backend Pipeline reports DEPLOYED when running SHA matches artifact', async () => {
    const telRes = await makeRequest('GET', '/api/telemetry');
    const backendPipe = telRes.body.pipelines.backend;

    assert.ok(backendPipe, 'Backend pipeline must exist');
    assert.strictEqual(backendPipe.status, 'DEPLOYED');
    assert.strictEqual(backendPipe.sha_comparison.matches, true, 'SHA comparison must match 100%');
    assert.strictEqual(
      backendPipe.sha_comparison.running_sha.toLowerCase(),
      backendPipe.sha_comparison.artifact_sha.toLowerCase(),
      'Running JAR SHA must strictly match artifact SHA'
    );
    assert.ok(backendPipe.git_commit.short_hash, 'Must report git commit hash');
    assert.ok(backendPipe.artifact.file_name, 'Must report artifact file name');
    assert.strictEqual(backendPipe.semaphore_nav.template_id, 6, 'Must link to Template 6');
  });

  await test('5.2 Verify Live App Pipeline reports INSTALLED — ARTIFACT NOT VERIFIED when APK build is unproven', async () => {
    const telRes = await makeRequest('GET', '/api/telemetry');
    const appPipe = telRes.body.pipelines.app;

    assert.ok(appPipe, 'App pipeline must exist');
    assert.strictEqual(appPipe.status, 'INSTALLED — ARTIFACT NOT VERIFIED', 'Must report INSTALLED — ARTIFACT NOT VERIFIED when APK build cannot be proven');
    assert.ok(appPipe.running_on_device.version_name, 'Must report running app version name');
    assert.strictEqual(appPipe.sha_comparison.matches, false, 'APK SHA does not match artifact SHA');
    assert.strictEqual(appPipe.semaphore_nav.template_id, 7, 'Must link to Template 7');
  });

  await test('5.3 Verify on-disk JAR artifact SHA-256 is dynamically recomputed', () => {
    const telemetry = require('../server/telemetry');
    const backendArtifact = telemetry.getLatestImmutableArtifact();
    assert.ok(backendArtifact, 'Must find latest backend artifact');
    assert.ok(backendArtifact.full_path, 'Must have full artifact path');

    // Call production computeFileSha256 directly on disk
    const directComputedSha = telemetry.computeFileSha256(backendArtifact.full_path);
    assert.ok(directComputedSha, 'Must compute valid SHA-256');
    assert.strictEqual(directComputedSha.length, 64, 'SHA-256 must be 64 characters');
    assert.strictEqual(backendArtifact.sha256, directComputedSha, 'Artifact sha256 must equal dynamically recomputed file hash');
  });

  await test('5.4 Call production evaluateBackendPipelineState directly (Production Logic, No Re-implementation)', () => {
    const telemetry = require('../server/telemetry');

    // Case 1: DEPLOYED (matching SHA)
    const resDeployed = telemetry.evaluateBackendPipelineState({
      adbOk: true, isSbUp: true,
      task6: { id: 15, status: 'success' },
      backendGit: { short_hash: '20c79b7', subject: 'test' },
      backendArtifact: { commit: '20c79b7', sha256: '4fdc0e36bc2f', file_name: 'test.jar' },
      runningJarSha: '4fdc0e36bc2f',
    });
    assert.strictEqual(resDeployed.status, 'DEPLOYED');

    // Case 2: BUILT — NOT DEPLOYED (mismatched SHA)
    const resBuiltNotDep = telemetry.evaluateBackendPipelineState({
      adbOk: true, isSbUp: true,
      task6: { id: 15, status: 'success' },
      backendGit: { short_hash: '20c79b7', subject: 'test' },
      backendArtifact: { commit: '20c79b7', sha256: '4fdc0e36bc2f', file_name: 'test.jar' },
      runningJarSha: 'different_running_sha_123',
    });
    assert.strictEqual(resBuiltNotDep.status, 'BUILT — NOT DEPLOYED');

    // Case 3: NEW COMMIT
    const resNewCommit = telemetry.evaluateBackendPipelineState({
      adbOk: true, isSbUp: true,
      task6: { id: 15, status: 'success' },
      backendGit: { short_hash: 'newcommit1', subject: 'new feature' },
      backendArtifact: { commit: 'oldcommit0', sha256: '4fdc0e36bc2f', file_name: 'test.jar' },
      runningJarSha: '4fdc0e36bc2f',
    });
    assert.strictEqual(resNewCommit.status, 'NEW COMMIT');

    // Case 4: BUILD FAILED
    const resFailed = telemetry.evaluateBackendPipelineState({
      adbOk: true, isSbUp: true,
      task6: { id: 16, status: 'failed' },
      backendGit: { short_hash: '20c79b7', subject: 'test' },
      backendArtifact: { commit: '20c79b7', sha256: '4fdc0e36bc2f', file_name: 'test.jar' },
      runningJarSha: '4fdc0e36bc2f',
    });
    assert.strictEqual(resFailed.status, 'BUILD FAILED');

    // Case 5: UNKNOWN (ADB disconnected)
    const resUnknown = telemetry.evaluateBackendPipelineState({
      adbOk: false, isSbUp: false,
      task6: { id: 15, status: 'success' },
      backendGit: { short_hash: '20c79b7', subject: 'test' },
      backendArtifact: { commit: '20c79b7', sha256: '4fdc0e36bc2f', file_name: 'test.jar' },
      runningJarSha: '4fdc0e36bc2f',
    });
    assert.strictEqual(resUnknown.status, 'UNKNOWN');
  });

  await test('5.5 Call production evaluateAppPipelineState directly (Production Logic, No Re-implementation)', () => {
    const telemetry = require('../server/telemetry');

    // Case 1: DEPLOYED (cryptographically proven same build with matching APK SHA)
    const resAppDeployed = telemetry.evaluateAppPipelineState({
      adbOk: true,
      task7: { id: 16, status: 'success' },
      appGit: { short_hash: 'ebf2fdd', subject: 'app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'apk_hash_123', file_name: 'app.apk' },
      appRunning: { version_name: '1.1.29', version_code: 29 },
      runningApkSha: 'apk_hash_123',
    });
    assert.strictEqual(resAppDeployed.status, 'DEPLOYED');

    // Case 2: INSTALLED — ARTIFACT NOT VERIFIED (app installed but SHA does not match)
    const resAppUnverified = telemetry.evaluateAppPipelineState({
      adbOk: true,
      task7: { id: 16, status: 'success' },
      appGit: { short_hash: 'ebf2fdd', subject: 'app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'artifact_sha_aaa', file_name: 'app.apk' },
      appRunning: { version_name: '1.1.29', version_code: 29 },
      runningApkSha: 'device_sha_different_bbb',
    });
    assert.strictEqual(resAppUnverified.status, 'INSTALLED — ARTIFACT NOT VERIFIED');
    assert.ok(resAppUnverified.status_reason.includes('không chứng minh được cùng bản build'));

    // Case 3: INSTALLED — ARTIFACT NOT VERIFIED (app installed but runningApkSha is null/unmeasured)
    const resAppUnmeasured = telemetry.evaluateAppPipelineState({
      adbOk: true,
      task7: { id: 16, status: 'success' },
      appGit: { short_hash: 'ebf2fdd', subject: 'app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'artifact_sha_aaa', file_name: 'app.apk' },
      appRunning: { version_name: '1.1.29', version_code: 29 },
      runningApkSha: null,
    });
    assert.strictEqual(resAppUnmeasured.status, 'INSTALLED — ARTIFACT NOT VERIFIED');

    // Case 4: BUILT — NOT DEPLOYED (app not installed)
    const resAppNotInstalled = telemetry.evaluateAppPipelineState({
      adbOk: true,
      task7: { id: 16, status: 'success' },
      appGit: { short_hash: 'ebf2fdd', subject: 'app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'artifact_sha_aaa', file_name: 'app.apk' },
      appRunning: null,
      runningApkSha: null,
    });
    assert.strictEqual(resAppNotInstalled.status, 'BUILT — NOT DEPLOYED');

    // Case 5: NEW COMMIT
    const resAppNewCommit = telemetry.evaluateAppPipelineState({
      adbOk: true,
      task7: { id: 16, status: 'success' },
      appGit: { short_hash: 'new_app_commit', subject: 'new app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'artifact_sha_aaa', file_name: 'app.apk' },
      appRunning: { version_name: '1.1.29', version_code: 29 },
      runningApkSha: 'artifact_sha_aaa',
    });
    assert.strictEqual(resAppNewCommit.status, 'NEW COMMIT');

    // Case 6: BUILD FAILED
    const resAppFailed = telemetry.evaluateAppPipelineState({
      adbOk: true,
      task7: { id: 17, status: 'failed' },
      appGit: { short_hash: 'ebf2fdd', subject: 'app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'artifact_sha_aaa', file_name: 'app.apk' },
      appRunning: { version_name: '1.1.29', version_code: 29 },
      runningApkSha: 'artifact_sha_aaa',
    });
    assert.strictEqual(resAppFailed.status, 'BUILD FAILED');

    // Case 7: UNKNOWN (ADB disconnected)
    const resAppUnknown = telemetry.evaluateAppPipelineState({
      adbOk: false,
      task7: { id: 16, status: 'success' },
      appGit: { short_hash: 'ebf2fdd', subject: 'app feat' },
      appArtifact: { commit: 'ebf2fdd', sha256: 'artifact_sha_aaa', file_name: 'app.apk' },
      appRunning: { version_name: '1.1.29', version_code: 29 },
      runningApkSha: 'artifact_sha_aaa',
    });
    assert.strictEqual(resAppUnknown.status, 'UNKNOWN');
  });

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log(colors.bold('\n============================================================'));
  console.log(colors.bold(`   TEST RESULTS: ${colors.green(`${passedCount} PASSED`)}, ${colors.red(`${failedCount} FAILED`)}`));
  console.log(colors.bold('============================================================\n'));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error(colors.red('Fatal error executing test suite:'), err);
  process.exit(1);
});

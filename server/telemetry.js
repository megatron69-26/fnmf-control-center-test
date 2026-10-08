/**
 * FNMF Test Control Center - Audited Telemetry & Operations Engine
 * 
 * Strict Audit Security Rules:
 * - NO HARDCODED PID, SHA, Task ID, DB metrics, or fake backup flags.
 * - Real Git, Semaphore, and on-disk Artifact telemetry with chain verification.
 * - Pipeline States: NEW COMMIT, BUILD FAILED, BUILT — NOT DEPLOYED, DEPLOYED, UNKNOWN.
 * - Comparing SHA of running JAR with artifact strictly (NEVER infer deployed from commit name).
 * - Direct Semaphore navigation links to templates and tasks (No auto-triggering).
 * - Operations Disarmed: Two operational buttons are temporarily disarmed for safety audit.
 * - Strict On-Disk Backup Hash Re-computation (checked before reporting verified).
 * - Real 5s Polling: exact measurement timestamps and data age without fake animations.
 */

const { execFile, execFileSync } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const ADB_PATH = 'C:/Users/khoid/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const ANDROID_USER_HOME = 'C:/Users/khoid/.android';
const DEVICE_ID = 'R3CM8105TPA';
const BACKUP_DIR = 'C:/Users/khoid/AppData/Local/fnmf-backups';
const BACKEND_ARTIFACT_DIR = 'C:/Users/khoid/Projects/artifacts/backend';
const APP_ARTIFACT_DIR = 'C:/Users/khoid/Projects/artifacts/app';
const BACKEND_REPO_DIR = 'C:/Users/khoid/Projects/fnmf-backend-test';
const APP_REPO_DIR = 'C:/Users/khoid/Projects/fnmf-app-test';

const SEMAPHORE_BASE_URL = 'http://127.0.0.1:3000';
const STALE_THRESHOLD_MS = 15000;
const POLL_INTERVAL_MS = 5000;
const GEMINI_CACHE_TTL_MS = 300000; // 5 minutes cache to avoid quota drain

// Real Semaphore Template IDs verified from Semaphore API
const TEMPLATE_HEALTH = 1; // Semaphore Template 1: Health Check (Read Only)
const TEMPLATE_BACKEND_BUILD = 6; // Semaphore Template 6: Build Backend Test từ Git
const TEMPLATE_APP_BUILD = 7; // Semaphore Template 7: Build App Test từ Git
const TEMPLATE_DEPLOY = 8; // Semaphore Template 8: Deploy Backend Test

// Safety Disarm Flag: operational buttons temporarily disabled per audit requirements
const OPERATIONS_DISARMED = true;
const DISARM_REASON = 'Nút thao tác tạm thời bị vô hiệu hóa để bảo đảm an toàn kiểm toán (Không kích hoạt deploy thật).';

// Helper: Read Git HEAD commit info directly from local repo
function getGitHead(repoDir) {
  try {
    if (!fs.existsSync(repoDir)) return null;
    const raw = execFileSync('git', ['log', '-1', '--format=%h|%H|%s|%cI'], {
      cwd: repoDir,
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
    if (!raw) return null;
    const [shortHash, fullHash, subject, date] = raw.split('|');
    return {
      short_hash: shortHash,
      full_hash: fullHash,
      subject,
      date,
      repo_dir: repoDir,
    };
  } catch (err) {
    console.error(`[Telemetry] Failed reading git log in ${repoDir}:`, err.message);
    return null;
  }
}

// Helper: Compute cryptographic SHA-256 directly from on-disk file bytes
function computeFileSha256(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (err) {
    console.error(`[Telemetry] Failed calculating SHA-256 for ${filePath}:`, err.message);
    return null;
  }
}

// Helper: Scan and validate latest immutable backend artifact
function getLatestImmutableArtifact() {
  try {
    if (!fs.existsSync(BACKEND_ARTIFACT_DIR)) return null;
    const files = fs.readdirSync(BACKEND_ARTIFACT_DIR);
    const immutableJars = files.filter((f) => /^fnmf-backend-test-[0-9a-fA-F]{7,40}_\d{8}_\d{6}\.jar$/.test(f));
    if (immutableJars.length === 0) return null;
    immutableJars.sort().reverse(); // Newest by timestamp
    const newest = immutableJars[0];
    const fullPath = path.join(BACKEND_ARTIFACT_DIR, newest);
    
    // Explicitly recalculate SHA-256 from disk file bytes
    const computedSha = computeFileSha256(fullPath);
    const shaPath = `${fullPath}.sha256`;
    let companionSha = null;
    if (fs.existsSync(shaPath)) {
      companionSha = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0];
    }
    const match = newest.match(/^fnmf-backend-test-([0-9a-fA-F]+)_(\d{8}_\d{6})\.jar$/);
    return {
      file_name: newest,
      full_path: fullPath,
      commit: match ? match[1] : null,
      timestamp: match ? match[2] : null,
      size_bytes: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : null,
      sha256: computedSha, // Always recomputed from disk
      companion_sha: companionSha,
      companion_sha_matched: Boolean(computedSha && companionSha && computedSha.toLowerCase() === companionSha.toLowerCase()),
      companion_sha_exists: fs.existsSync(shaPath),
    };
  } catch (err) {
    console.error('[Telemetry] Error scanning backend artifacts:', err.message);
    return null;
  }
}

// Helper: Scan and validate latest immutable app artifact
function getLatestImmutableAppArtifact() {
  try {
    if (!fs.existsSync(APP_ARTIFACT_DIR)) return null;
    const files = fs.readdirSync(APP_ARTIFACT_DIR);
    const immutableApks = files.filter((f) => /^fnmf-app-debug-[0-9a-fA-F]{7,40}_\d{8}_\d{6}\.apk$/.test(f));
    if (immutableApks.length === 0) return null;
    immutableApks.sort().reverse();
    const newest = immutableApks[0];
    const fullPath = path.join(APP_ARTIFACT_DIR, newest);
    
    // Explicitly recalculate SHA-256 from disk file bytes
    const computedSha = computeFileSha256(fullPath);
    const shaPath = `${fullPath}.sha256`;
    let companionSha = null;
    if (fs.existsSync(shaPath)) {
      companionSha = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0];
    }
    const match = newest.match(/^fnmf-app-debug-([0-9a-fA-F]+)_(\d{8}_\d{6})\.apk$/);
    return {
      file_name: newest,
      full_path: fullPath,
      commit: match ? match[1] : null,
      timestamp: match ? match[2] : null,
      size_bytes: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : null,
      sha256: computedSha, // Always recomputed from disk
      companion_sha: companionSha,
      companion_sha_matched: Boolean(computedSha && companionSha && computedSha.toLowerCase() === companionSha.toLowerCase()),
      companion_sha_exists: fs.existsSync(shaPath),
    };
  } catch (err) {
    console.error('[Telemetry] Error scanning app artifacts:', err.message);
    return null;
  }
}

// Telemetry State Cache
const state = {
  last_probe_time: 0,
  last_device_success: 0,
  is_stale: true,
  simulate_drop: false,
  operations: {
    disarmed: OPERATIONS_DISARMED,
    disarm_reason: DISARM_REASON,
    template_deploy_id: TEMPLATE_DEPLOY,
    template_health_id: TEMPLATE_HEALTH,
  },
  pipelines: {
    backend: {
      component: 'Spring Boot Backend',
      git_commit: null,
      build_task: null,
      artifact: null,
      running_on_device: null,
      status: 'UNKNOWN',
      status_reason: 'Đang khởi tạo chuỗi kiểm tra...',
      sha_comparison: {
        running_sha: null,
        artifact_sha: null,
        matches: false,
      },
      semaphore_nav: {
        template_id: TEMPLATE_BACKEND_BUILD,
        template_name: 'Template 6: Build Backend Test từ Git',
        template_url: `${SEMAPHORE_BASE_URL}/project/1/templates/6`,
        latest_task_id: null,
        latest_task_url: null,
      },
    },
    app: {
      component: 'Android App (fnmf-app-test)',
      git_commit: null,
      build_task: null,
      artifact: null,
      running_on_device: null,
      status: 'UNKNOWN',
      status_reason: 'Đang khởi tạo chuỗi kiểm tra...',
      semaphore_nav: {
        template_id: TEMPLATE_APP_BUILD,
        template_name: 'Template 7: Build App Test từ Git',
        template_url: `${SEMAPHORE_BASE_URL}/project/1/templates/7`,
        latest_task_id: null,
        latest_task_url: null,
      },
    },
  },
  nodes: {
    host_bridge: {
      id: 'host_bridge',
      title: 'Laptop Host Bridge',
      category: 'host',
      status: 'UP',
      measurement_source: 'Windows Local TCP / OS',
      latency_ms: 0,
      details: {
        os: 'Windows 11 (Laptop Host)',
        adb_port: 5037,
        control_center_port: 4100,
        dashy_port: 4000,
        grafana_port: 3001,
        semaphore_port: 3000,
      },
      last_check: null,
    },
    android_device: {
      id: 'android_device',
      title: 'Galaxy Note 10+ 5G',
      category: 'device',
      status: 'INITIALIZING',
      measurement_source: 'platform-tools/adb.exe devices -l',
      latency_ms: null,
      details: {
        serial: DEVICE_ID,
        model: 'SM-N976B (Exynos 9825)',
        transport: 'USB Direct Cable',
        adb_forward: 'tcp:8083 -> tcp:8083',
        pipeline: null,
      },
      last_check: null,
    },
    spring_boot: {
      id: 'spring_boot',
      title: 'Spring Boot Backend',
      category: 'backend',
      subtitle: 'Monolith Service (Port 8083)',
      status: 'INITIALIZING',
      measurement_source: 'Termux PID, SHA256 & Actuator Health',
      latency_ms: null,
      details: {
        port: 8083,
        architecture: 'Monolith (NOT microservices)',
        pid: null,
        jar_file: 'llm-gateway-1.1.17.jar',
        jar_sha256: null,
        actuator_health: 'UNKNOWN',
        rate_limit_filter: 'Enforced (10 req/min for unlisted routes)',
        latest_immutable_artifact: getLatestImmutableArtifact(),
        pipeline: null,
      },
      last_check: null,
    },
    postgresql: {
      id: 'postgresql',
      title: 'PostgreSQL Database',
      category: 'database',
      subtitle: 'Database fnmf_test (Port 5432)',
      status: 'INITIALIZING',
      measurement_source: 'Termux psql CLI (Audit SQL)',
      latency_ms: null,
      details: {
        db_name: 'fnmf_test',
        port: 5432,
        tables_count: null,
        flyway_version: null,
        users_count: null,
        wallets_count: null,
        latest_backup: null,
        backup_verified: false,
        backup_hash_matched: false,
        backup_sha256: null,
        backup_size_bytes: null,
        backup_reconciled_metrics: null,
        backup_verification_method: null,
      },
      last_check: null,
    },
    binance_rest: {
      id: 'binance_rest',
      title: 'Binance Public REST API',
      category: 'market',
      status: 'INITIALIZING',
      measurement_source: 'Public Binance REST (/api/v3/ticker/price)',
      latency_ms: null,
      details: {
        symbols_tracked: 5,
        prices: {},
        rate_limit: '1200 req/min (Binance IP limit)',
      },
      last_check: null,
    },
    binance_ws: {
      id: 'binance_ws',
      title: 'Binance App WebSocket',
      category: 'market',
      subtitle: 'Kline Stream (Note 10+ App)',
      status: 'NOT_MEASURED',
      measurement_source: 'Note 10+ Socket Tracing (Uninstrumented)',
      latency_ms: null,
      details: {
        target_stream: 'wss://data-stream.binance.vision/ws/<symbol>@kline_1m',
        audit_note: 'Not measured: pidof is NOT valid proof of WebSocket handshake. Real socket tracing is uninstrumented.',
        socket_established: false,
      },
      last_check: null,
    },
    gemini_ai: {
      id: 'gemini_ai',
      title: 'Google Gemini AI',
      category: 'ai',
      subtitle: 'Market Forecast (24h Shard)',
      status: 'UNAVAILABLE',
      measurement_source: 'Backend /api/forecast/market (Cached 5m)',
      latency_ms: null,
      details: {
        model: 'gemini-2.5-flash',
        shard_strategy: '24h Cache-First (Zero external API on cache hit)',
        reason: 'API key not configured in test environment (Expected sandbox behavior)',
        next_probe_allowed_at: null,
      },
      last_check: null,
    },
    semaphore_cicd: {
      id: 'semaphore_cicd',
      title: 'Semaphore CI/CD',
      category: 'ops',
      subtitle: 'Local Pure-Go Server (Port 3000)',
      status: 'INITIALIZING',
      measurement_source: 'Semaphore REST API (/api/project/1/tasks)',
      latency_ms: null,
      details: {
        url: SEMAPHORE_BASE_URL,
        version: '2.19.12',
        latest_task_id: null,
        latest_task_status: null,
        latest_task_template: null,
        templates: [
          { id: 1, name: 'Health Check (Read Only)' },
          { id: 4, name: 'Backup DB (PostgreSQL Stream & Verify)' },
          { id: 5, name: 'Restart Backend Test' },
          { id: 6, name: 'Build Backend Test từ Git' },
          { id: 7, name: 'Build App Test từ Git' },
          { id: 8, name: 'Deploy Backend Test' },
        ],
      },
      last_check: null,
    },
  },
};

// Safe Child Process Executor with Timeout
function runCommand(cmd, args, timeoutMs = 4000) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: timeoutMs,
        windowsHide: true,
        env: {
          ...process.env,
          HOME: ANDROID_USER_HOME,
          USERPROFILE: 'C:/Users/khoid',
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ ok: false, error: error.message, stdout: '', stderr: stderr || '' });
        } else {
          resolve({ ok: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
        }
      }
    );
  });
}

// HTTP Helper with Timeout
function httpGet(url, headers = {}, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.get(url, { headers, timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          body,
        });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'TIMEOUT' }); });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
  });
}

// 1. Probe Android Note 10+
async function probeAndroid() {
  const t0 = Date.now();
  const res = await runCommand(ADB_PATH, ['devices', '-l'], 3000);
  const latency = Date.now() - t0;
  const isConnected = res.ok && res.stdout.includes(DEVICE_ID) && res.stdout.includes('device');

  if (isConnected) {
    runCommand(ADB_PATH, ['forward', 'tcp:8083', 'tcp:8083'], 1000).catch(() => {});
    state.nodes.android_device.status = 'UP';
    state.nodes.android_device.latency_ms = latency;
    state.nodes.android_device.last_check = new Date().toISOString();
    return true;
  } else {
    state.nodes.android_device.status = 'DISCONNECTED';
    state.nodes.android_device.latency_ms = latency;
    state.nodes.android_device.last_check = new Date().toISOString();
    return false;
  }
}

// 2. Probe Spring Boot Backend on Termux
let lastActuatorCheck = 0;
let cachedActuatorStatus = 'UP';

async function probeSpringBoot(adbOk) {
  state.nodes.spring_boot.details.latest_immutable_artifact = getLatestImmutableArtifact();

  if (!adbOk) {
    state.nodes.spring_boot.status = 'UNKNOWN_STALE';
    state.nodes.spring_boot.latency_ms = null;
    state.nodes.spring_boot.details.pid = null;
    state.nodes.spring_boot.details.jar_sha256 = null;
    state.nodes.spring_boot.details.actuator_health = 'ADB_DISCONNECTED';
    state.nodes.spring_boot.last_check = new Date().toISOString();
    return;
  }

  const t0 = Date.now();
  const now = Date.now();
  const shouldProbeHttp = (now - lastActuatorCheck >= 20000);

  const commands = [
    runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', 'run-as com.termux cat /data/data/com.termux/files/home/backend.pid 2>/dev/null']),
    runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', 'run-as com.termux sha256sum /data/data/com.termux/files/home/llm-gateway-1.1.17.jar 2>/dev/null']),
  ];
  if (shouldProbeHttp) {
    commands.push(runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', 'run-as com.termux /data/data/com.termux/files/usr/bin/curl -s -m 2 http://127.0.0.1:8083/actuator/health']));
  }

  const results = await Promise.all(commands);
  const latency = Date.now() - t0;
  const pidRes = results[0];
  const shaRes = results[1];

  const pid = pidRes.ok && /^\d+$/.test(pidRes.stdout) ? pidRes.stdout : null;
  const sha = shaRes.ok && shaRes.stdout.length >= 64 ? shaRes.stdout.split(/\s+/)[0] : null;

  if (shouldProbeHttp) {
    lastActuatorCheck = now;
    const healthRes = results[2];
    if (healthRes.ok && healthRes.stdout.includes('"status":"UP"')) {
      cachedActuatorStatus = 'UP';
    } else if (healthRes.ok && healthRes.stdout.includes('Rate limit exceeded')) {
      cachedActuatorStatus = 'UP (Enforcing RateLimit)';
    } else {
      cachedActuatorStatus = 'NON_RESPONSIVE';
    }
  }

  const isUp = (cachedActuatorStatus.startsWith('UP') || cachedActuatorStatus === 'UP') && pid !== null;

  state.nodes.spring_boot.status = isUp ? 'UP' : 'DOWN';
  state.nodes.spring_boot.latency_ms = latency;
  state.nodes.spring_boot.details.pid = pid;
  state.nodes.spring_boot.details.jar_sha256 = sha;
  state.nodes.spring_boot.details.actuator_health = cachedActuatorStatus;
  state.nodes.spring_boot.last_check = new Date().toISOString();
}

// 3. Probe PostgreSQL Database on Termux
async function probePostgres(adbOk) {
  if (!adbOk) {
    state.nodes.postgresql.status = 'UNKNOWN_STALE';
    state.nodes.postgresql.latency_ms = null;
    state.nodes.postgresql.details.tables_count = null;
    state.nodes.postgresql.details.flyway_version = null;
    state.nodes.postgresql.details.users_count = null;
    state.nodes.postgresql.details.wallets_count = null;
    state.nodes.postgresql.details.backup_verified = false;
    state.nodes.postgresql.details.backup_hash_matched = false;
    state.nodes.postgresql.last_check = new Date().toISOString();
    return;
  }

  const t0 = Date.now();
  const sql = "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public'), (SELECT coalesce(version,'0') FROM flyway_schema_history WHERE success=true ORDER BY installed_rank DESC LIMIT 1), (SELECT count(*) FROM users), (SELECT count(*) FROM wallets);";
  const cmd = `run-as com.termux /data/data/com.termux/files/usr/bin/psql -d fnmf_test -U fnmf_test_user -v ON_ERROR_STOP=1 -t -A -F ',' -c "${sql}"`;
  const res = await runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', cmd]);
  const latency = Date.now() - t0;

  const match = res.ok ? res.stdout.match(/^(\d+),([a-zA-Z0-9_]+),(\d+),(\d+)$/) : null;
  if (match) {
    state.nodes.postgresql.status = 'UP';
    state.nodes.postgresql.latency_ms = latency;
    state.nodes.postgresql.details.tables_count = parseInt(match[1], 10);
    state.nodes.postgresql.details.flyway_version = `V${match[2]}`;
    state.nodes.postgresql.details.users_count = parseInt(match[3], 10);
    state.nodes.postgresql.details.wallets_count = parseInt(match[4], 10);
  } else {
    state.nodes.postgresql.status = 'ERROR';
    state.nodes.postgresql.latency_ms = latency;
    state.nodes.postgresql.details.tables_count = null;
    state.nodes.postgresql.details.flyway_version = null;
    state.nodes.postgresql.details.users_count = null;
    state.nodes.postgresql.details.wallets_count = null;
  }

  // Strict On-Disk Hash Re-computation for Database Backup
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sql'));
      if (files.length > 0) {
        files.sort().reverse();
        const latest = files[0];
        const latestPath = path.join(BACKUP_DIR, latest);
        const manifestPath = path.join(BACKUP_DIR, `${latest}.verified.json`);
        let verified = false;
        let reconciled = null;
        let computedSha256 = null;
        let hashMatched = false;
        let verificationMethod = null;
        let backupSizeBytes = null;

        if (fs.existsSync(latestPath) && fs.existsSync(manifestPath)) {
          try {
            const stat = fs.statSync(latestPath);
            backupSizeBytes = stat.size;
            if (backupSizeBytes > 0) {
              const fileBuffer = fs.readFileSync(latestPath);
              computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              const manifestSha = (manifest.sha256 || '').trim().toLowerCase();
              hashMatched = Boolean(manifestSha && computedSha256.toLowerCase() === manifestSha);

              if (manifest.verified === true && hashMatched && manifest.size_bytes === backupSizeBytes) {
                verified = true;
                reconciled = manifest.reconciled_metrics;
                verificationMethod = 'Direct On-Disk SHA-256 Re-computation & Manifest Match';
              }
            }
          } catch (err) {
            console.error('[Telemetry] Backup file calculation error:', err.message);
          }
        }
        state.nodes.postgresql.details.latest_backup = latest;
        state.nodes.postgresql.details.backup_verified = verified;
        state.nodes.postgresql.details.backup_sha256 = computedSha256;
        state.nodes.postgresql.details.backup_hash_matched = hashMatched;
        state.nodes.postgresql.details.backup_size_bytes = backupSizeBytes;
        state.nodes.postgresql.details.backup_reconciled_metrics = reconciled;
        state.nodes.postgresql.details.backup_verification_method = verificationMethod;
      }
    }
  } catch {}

  state.nodes.postgresql.last_check = new Date().toISOString();
}

// 4. Probe Binance REST
async function probeBinanceRest() {
  const t0 = Date.now();
  const url = 'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BNBUSDT%22,%22SOLUSDT%22,%22XRPUSDT%22,%22ADAUSDT%22,%22DOGEUSDT%22%5D';
  const res = await httpGet(url, {}, 3000);
  const latency = Date.now() - t0;

  if (res.ok) {
    try {
      const list = JSON.parse(res.body);
      const prices = {};
      list.forEach((item) => { prices[item.symbol] = parseFloat(item.price); });
      state.nodes.binance_rest.status = 'UP';
      state.nodes.binance_rest.latency_ms = latency;
      state.nodes.binance_rest.details.prices = prices;
    } catch {
      state.nodes.binance_rest.status = 'DEGRADED';
    }
  } else {
    state.nodes.binance_rest.status = 'OFFLINE';
  }
  state.nodes.binance_rest.last_check = new Date().toISOString();
}

// 5. Probe Binance App WebSocket (Audit Rule: Strictly NOT_MEASURED)
async function probeBinanceWebSocket(adbOk) {
  state.nodes.binance_ws.status = 'NOT_MEASURED';
  state.nodes.binance_ws.details.audit_note =
    'Not measured: Socket handshake tracing is uninstrumented. pidof is intentionally rejected as proof.';
  state.nodes.binance_ws.last_check = new Date().toISOString();
}

// 6. Probe Gemini AI (Cached for 5 minutes)
let lastGeminiProbe = 0;
let cachedGeminiDetails = {
  status: 'UNAVAILABLE',
  reason: 'API key not configured in test environment (Expected sandbox behavior)',
};

async function probeGeminiAI(adbOk) {
  if (!adbOk) {
    state.nodes.gemini_ai.status = 'UNKNOWN_STALE';
    state.nodes.gemini_ai.last_check = new Date().toISOString();
    return;
  }

  const now = Date.now();
  if (now - lastGeminiProbe < GEMINI_CACHE_TTL_MS) {
    state.nodes.gemini_ai.status = cachedGeminiDetails.status;
    state.nodes.gemini_ai.details.reason = cachedGeminiDetails.reason;
    state.nodes.gemini_ai.details.next_probe_allowed_at = new Date(lastGeminiProbe + GEMINI_CACHE_TTL_MS).toISOString();
    state.nodes.gemini_ai.last_check = new Date().toISOString();
    return;
  }

  lastGeminiProbe = now;
  const cmd = 'run-as com.termux /data/data/com.termux/files/usr/bin/curl -s -m 2 http://127.0.0.1:8083/api/forecast/market';
  const res = await runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', cmd]);

  if (res.ok && res.stdout.includes('Forecast model not available')) {
    cachedGeminiDetails = {
      status: 'UNAVAILABLE',
      reason: 'Backend returned 503: API key not configured in test environment (Expected sandbox behavior)',
    };
  } else if (res.ok && res.stdout.includes('forecast')) {
    cachedGeminiDetails = {
      status: 'UP',
      reason: 'Forecast API responded with cached 24h market analysis',
    };
  } else {
    cachedGeminiDetails = {
      status: 'NON_RESPONSIVE',
      reason: res.stdout.substring(0, 120) || 'No response from forecast API',
    };
  }

  state.nodes.gemini_ai.status = cachedGeminiDetails.status;
  state.nodes.gemini_ai.details.reason = cachedGeminiDetails.reason;
  state.nodes.gemini_ai.details.next_probe_allowed_at = new Date(now + GEMINI_CACHE_TTL_MS).toISOString();
  state.nodes.gemini_ai.last_check = new Date().toISOString();
}

// 7. Probe Semaphore CI/CD Tasks
async function probeSemaphore() {
  const t0 = Date.now();
  let token = '';
  try {
    token = config.getSemaphoreToken();
  } catch (err) {
    state.nodes.semaphore_cicd.status = 'DOWN';
    state.nodes.semaphore_cicd.details.reason = err.message;
    state.nodes.semaphore_cicd.last_check = new Date().toISOString();
    return [];
  }

  const url = `${SEMAPHORE_BASE_URL}/api/project/1/tasks?limit=25`;
  const res = await httpGet(url, {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  }, 2500);
  const latency = Date.now() - t0;

  let tasks = [];
  if (res.ok) {
    try {
      const list = JSON.parse(res.body);
      if (Array.isArray(list) && list.length > 0) {
        tasks = list;
        const latest = list[0];
        state.nodes.semaphore_cicd.status = 'UP';
        state.nodes.semaphore_cicd.latency_ms = latency;
        state.nodes.semaphore_cicd.details.latest_task_id = latest.id;
        state.nodes.semaphore_cicd.details.latest_task_status = latest.status;
        state.nodes.semaphore_cicd.details.latest_task_template =
          latest.template_id === TEMPLATE_DEPLOY ? 'Template 8: Deploy Backend Test'
          : latest.template_id === TEMPLATE_HEALTH ? 'Template 1: Health Check'
          : latest.template_id === TEMPLATE_BACKEND_BUILD ? 'Template 6: Build Backend Test'
          : latest.template_id === TEMPLATE_APP_BUILD ? 'Template 7: Build App Test'
          : `Template #${latest.template_id}`;
      }
    } catch {
      state.nodes.semaphore_cicd.status = 'DEGRADED';
    }
  } else {
    state.nodes.semaphore_cicd.status = 'DOWN';
  }
  state.nodes.semaphore_cicd.last_check = new Date().toISOString();
  return tasks;
}

// --- Production Pipeline State Evaluator for Backend ---
function evaluateBackendPipelineState({ adbOk, isSbUp, task6, backendGit, backendArtifact, runningJarSha }) {
  if (!adbOk || !isSbUp) {
    return {
      status: 'UNKNOWN',
      status_reason: 'Mất kết nối ADB hoặc dịch vụ Spring Boot trên Note 10+ không phản hồi.',
    };
  }
  if (task6 && (task6.status === 'failed' || task6.status === 'error')) {
    return {
      status: 'BUILD FAILED',
      status_reason: `Tác vụ build gần nhất (Semaphore Task #${task6.id}, Template 6) bị thất bại (${task6.status}).`,
    };
  }
  if (backendGit && backendArtifact && backendGit.short_hash !== backendArtifact.commit) {
    return {
      status: 'NEW COMMIT',
      status_reason: `Phát hiện commit mới trong Git (${backendGit.short_hash} - "${backendGit.subject}") chưa khớp với commit của artifact build hiện tại (${backendArtifact.commit}).`,
    };
  }
  if (!backendArtifact) {
    return {
      status: 'UNKNOWN',
      status_reason: 'Chưa tìm thấy tệp artifact backend (.jar) hợp lệ trên đĩa.',
    };
  }
  const artifactSha = backendArtifact.sha256 ? backendArtifact.sha256.toLowerCase() : null;
  const runningSha = runningJarSha ? runningJarSha.toLowerCase() : null;
  if (!runningSha || runningSha !== artifactSha) {
    return {
      status: 'BUILT — NOT DEPLOYED',
      status_reason: `Artifact đã được build (${backendArtifact.file_name}), nhưng mã SHA-256 của JAR đang chạy trên Note 10+ (${runningJarSha?.substring(0, 12)}...) không khớp với artifact build (${backendArtifact.sha256?.substring(0, 12)}...).`,
    };
  }
  return {
    status: 'DEPLOYED',
    status_reason: `Mã băm SHA-256 của JAR đang chạy trên Note 10+ (${runningJarSha.substring(0, 12)}...) khớp 100% với tệp build ${backendArtifact.file_name}.`,
  };
}

// --- Production Pipeline State Evaluator for Android App ---
function evaluateAppPipelineState({ adbOk, task7, appGit, appArtifact, appRunning, runningApkSha }) {
  if (!adbOk) {
    return {
      status: 'UNKNOWN',
      status_reason: 'Mất kết nối ADB tới Samsung Galaxy Note 10+.',
    };
  }
  if (task7 && (task7.status === 'failed' || task7.status === 'error')) {
    return {
      status: 'BUILD FAILED',
      status_reason: `Tác vụ build App gần nhất (Semaphore Task #${task7.id}, Template 7) bị thất bại (${task7.status}).`,
    };
  }
  if (appGit && appArtifact && appGit.short_hash !== appArtifact.commit) {
    return {
      status: 'NEW COMMIT',
      status_reason: `Git commit mới (${appGit.short_hash}) chưa có artifact build (artifact hiện tại gắn commit ${appArtifact.commit}).`,
    };
  }
  if (!appArtifact) {
    return {
      status: 'UNKNOWN',
      status_reason: 'Chưa tìm thấy tệp artifact APK hợp lệ trên đĩa.',
    };
  }
  if (!appRunning || !appRunning.version_name) {
    return {
      status: 'BUILT — NOT DEPLOYED',
      status_reason: 'APK artifact đã build nhưng ứng dụng chưa được cài đặt trên Note 10+.',
    };
  }

  // Audit Requirement: Prove the installed APK is the exact same build artifact
  const artifactSha = appArtifact.sha256 ? appArtifact.sha256.toLowerCase() : null;
  const runningSha = runningApkSha ? runningApkSha.toLowerCase() : null;
  const isShaProven = Boolean(artifactSha && runningSha && artifactSha === runningSha);

  if (isShaProven) {
    return {
      status: 'DEPLOYED',
      status_reason: `Mã băm SHA-256 của APK cài trên Note 10+ (${runningSha.substring(0, 12)}...) khớp 100% với artifact build ${appArtifact.file_name}.`,
    };
  }

  // Installed, but cannot prove same build artifact
  return {
    status: 'INSTALLED — ARTIFACT NOT VERIFIED',
    status_reason: `Ứng dụng v${appRunning.version_name} (code ${appRunning.version_code}) đã cài trên Note 10+, nhưng không chứng minh được cùng bản build với artifact ${appArtifact.file_name} (${runningSha ? 'SHA-256 không khớp' : 'chưa đo được SHA-256 base.apk'}).`,
  };
}

// 8. Probe Pipeline Chain: Git Commit → Semaphore Build Task → Artifact → Note 10+ Running Version
async function probePipelines(adbOk, tasks = []) {
  // 1. Read Git Commits
  const backendGit = getGitHead(BACKEND_REPO_DIR);
  const appGit = getGitHead(APP_REPO_DIR);

  // 2. Read Immutable Artifacts (Always Recalculate On-Disk SHA-256)
  const backendArtifact = getLatestImmutableArtifact();
  const appArtifact = getLatestImmutableAppArtifact();

  // Explicit dynamic recalculation of JAR artifact SHA-256 right before comparison
  if (backendArtifact && backendArtifact.full_path) {
    backendArtifact.sha256 = computeFileSha256(backendArtifact.full_path);
  }
  if (appArtifact && appArtifact.full_path) {
    appArtifact.sha256 = computeFileSha256(appArtifact.full_path);
  }

  // 3. Find latest build tasks from Semaphore
  const task6 = Array.isArray(tasks) ? tasks.find((t) => t.template_id === TEMPLATE_BACKEND_BUILD) : null;
  const task7 = Array.isArray(tasks) ? tasks.find((t) => t.template_id === TEMPLATE_APP_BUILD) : null;

  // 4. Running Backend on Note 10+
  const runningJarSha = state.nodes.spring_boot.details.jar_sha256;
  const runningPid = state.nodes.spring_boot.details.pid;
  const isSbUp = adbOk && state.nodes.spring_boot.status === 'UP';

  // Evaluate Backend Pipeline State using Production Logic
  const backendEval = evaluateBackendPipelineState({
    adbOk,
    isSbUp,
    task6,
    backendGit,
    backendArtifact,
    runningJarSha,
  });

  state.pipelines.backend = {
    component: 'Spring Boot Backend',
    git_commit: backendGit,
    build_task: task6 ? {
      id: task6.id,
      status: task6.status,
      created: task6.created,
      commit_hash: task6.commit_hash,
      template_id: TEMPLATE_BACKEND_BUILD,
    } : null,
    artifact: backendArtifact,
    running_on_device: {
      pid: runningPid,
      jar_file: 'llm-gateway-1.1.17.jar',
      jar_sha256: runningJarSha,
      status: state.nodes.spring_boot.status,
    },
    status: backendEval.status,
    status_reason: backendEval.status_reason,
    sha_comparison: {
      running_sha: runningJarSha,
      artifact_sha: backendArtifact?.sha256 || null,
      matches: Boolean(runningJarSha && backendArtifact?.sha256 && runningJarSha.toLowerCase() === backendArtifact.sha256.toLowerCase()),
    },
    semaphore_nav: {
      template_id: TEMPLATE_BACKEND_BUILD,
      template_name: 'Template 6: Build Backend Test từ Git',
      template_url: `${SEMAPHORE_BASE_URL}/project/1/templates/6`,
      latest_task_id: task6?.id || null,
      latest_task_url: task6 ? `${SEMAPHORE_BASE_URL}/project/1/history?task=${task6.id}` : null,
    },
  };
  state.nodes.spring_boot.details.pipeline = state.pipelines.backend;

  // 5. Running App on Note 10+ & Probe Base APK SHA-256
  let appRunning = null;
  let runningApkSha = null;
  if (adbOk) {
    try {
      const dumpRes = await runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', 'dumpsys package com.example.nhumonglenh.test'], 3000);
      if (dumpRes.ok) {
        const vName = (dumpRes.stdout.match(/versionName=([^\s]+)/) || [])[1] || null;
        const vCode = (dumpRes.stdout.match(/versionCode=(\d+)/) || [])[1] || null;
        if (vName) {
          appRunning = { package_name: 'com.example.nhumonglenh.test', version_name: vName, version_code: vCode };

          // Probe installed base.apk path on Note 10+
          const pathRes = await runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', 'pm path com.example.nhumonglenh.test'], 2500);
          if (pathRes.ok && pathRes.stdout.includes('package:')) {
            const rawPath = pathRes.stdout.replace('package:', '').trim().split('\n')[0].trim();
            if (rawPath) {
              const shaRes = await runCommand(ADB_PATH, ['-s', DEVICE_ID, 'shell', `sha256sum "${rawPath}"`], 3000);
              if (shaRes.ok) {
                runningApkSha = (shaRes.stdout.match(/^[0-9a-fA-F]{64}/) || [])[0] || null;
              }
            }
          }
        }
      }
    } catch {}
  }

  // Evaluate App Pipeline State using Production Logic
  const appEval = evaluateAppPipelineState({
    adbOk,
    task7,
    appGit,
    appArtifact,
    appRunning,
    runningApkSha,
  });

  state.pipelines.app = {
    component: 'Android App (fnmf-app-test)',
    git_commit: appGit,
    build_task: task7 ? {
      id: task7.id,
      status: task7.status,
      created: task7.created,
      commit_hash: task7.commit_hash,
      template_id: TEMPLATE_APP_BUILD,
    } : null,
    artifact: appArtifact,
    running_on_device: {
      ...appRunning,
      apk_sha256: runningApkSha,
    },
    status: appEval.status,
    status_reason: appEval.status_reason,
    sha_comparison: {
      running_sha: runningApkSha,
      artifact_sha: appArtifact?.sha256 || null,
      matches: Boolean(runningApkSha && appArtifact?.sha256 && runningApkSha.toLowerCase() === appArtifact.sha256.toLowerCase()),
    },
    semaphore_nav: {
      template_id: TEMPLATE_APP_BUILD,
      template_name: 'Template 7: Build App Test từ Git',
      template_url: `${SEMAPHORE_BASE_URL}/project/1/templates/7`,
      latest_task_id: task7?.id || null,
      latest_task_url: task7 ? `${SEMAPHORE_BASE_URL}/project/1/history?task=${task7.id}` : null,
    },
  };
  state.nodes.android_device.details.pipeline = state.pipelines.app;
}

// Master Polling Loop (Strictly 5 Seconds)
async function collectAllTelemetry() {
  state.last_probe_time = Date.now();
  state.nodes.host_bridge.last_check = new Date().toISOString();

  if (state.simulate_drop) {
    state.is_stale = true;
    state.nodes.android_device.status = 'DISCONNECTED';
    state.nodes.spring_boot.status = 'UNKNOWN_STALE';
    state.nodes.postgresql.status = 'UNKNOWN_STALE';
    state.nodes.gemini_ai.status = 'UNKNOWN_STALE';
    state.nodes.binance_ws.status = 'NOT_MEASURED';

    // Invalidate live numbers so they are never displayed as live!
    state.nodes.postgresql.details.tables_count = null;
    state.nodes.postgresql.details.flyway_version = null;
    state.nodes.postgresql.details.users_count = null;
    state.nodes.postgresql.details.wallets_count = null;
    state.nodes.postgresql.details.backup_verified = false;
    state.nodes.postgresql.details.backup_hash_matched = false;
    state.nodes.spring_boot.details.pid = null;
    state.nodes.spring_boot.details.jar_sha256 = null;

    const tasks = await probeSemaphore();
    await probeBinanceRest();
    await probePipelines(false, tasks);
    return;
  }

  try {
    const adbOk = await probeAndroid();
    if (adbOk) {
      state.last_device_success = Date.now();
    }

    const [tasks] = await Promise.all([
      probeSemaphore(),
      probeSpringBoot(adbOk),
      probePostgres(adbOk),
      probeBinanceRest(),
      probeBinanceWebSocket(adbOk),
      probeGeminiAI(adbOk),
    ]);

    const elapsed = Math.floor((Date.now() - state.last_device_success) / 1000);
    state.is_stale = elapsed > (STALE_THRESHOLD_MS / 1000);

    if (state.is_stale || !adbOk) {
      state.nodes.android_device.status = 'DISCONNECTED';
      state.nodes.spring_boot.status = 'UNKNOWN_STALE';
      state.nodes.postgresql.status = 'UNKNOWN_STALE';
      state.nodes.gemini_ai.status = 'UNKNOWN_STALE';

      state.nodes.postgresql.details.tables_count = null;
      state.nodes.postgresql.details.flyway_version = null;
      state.nodes.postgresql.details.users_count = null;
      state.nodes.postgresql.details.wallets_count = null;
      state.nodes.postgresql.details.backup_verified = false;
      state.nodes.postgresql.details.backup_hash_matched = false;
      state.nodes.spring_boot.details.pid = null;
      state.nodes.spring_boot.details.jar_sha256 = null;
    }

    await probePipelines(adbOk && !state.is_stale, tasks);
  } catch (err) {
    console.error('Error during telemetry collection:', err.message);
  }
}

setInterval(collectAllTelemetry, POLL_INTERVAL_MS);
collectAllTelemetry();

// Safe Ops Dispatcher (Internal Only)
function dispatchSemaphoreTask(templateId, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    let token = '';
    try {
      token = config.getSemaphoreToken();
    } catch (err) {
      return resolve({ ok: false, error: err.message });
    }

    const postData = JSON.stringify({
      template_id: templateId,
      debug: false,
      dry_run: false,
      diff: false,
      playbook: '',
      environment: JSON.stringify(extraEnv),
    });

    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/project/1/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ ok: res.statusCode === 201 || res.statusCode === 200, data: json });
        } catch (e) {
          resolve({ ok: false, error: body });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

module.exports = {
  getTelemetryState: () => state,
  getLatestImmutableArtifact,
  getLatestImmutableAppArtifact,
  computeFileSha256,
  evaluateBackendPipelineState,
  evaluateAppPipelineState,
  getGitHead,
  setSimulateDrop: (drop) => {
    state.simulate_drop = drop;
    if (drop) {
      state.last_device_success = Date.now() - 30000;
      state.is_stale = true;
    } else {
      collectAllTelemetry();
    }
    return state;
  },

  // Health Check trigger (Template 1)
  triggerHealthCheck: async (options = {}) => {
    if (OPERATIONS_DISARMED && !options.allow_mock) {
      const err = new Error(DISARM_REASON);
      err.code = 'OPERATIONS_DISARMED';
      throw err;
    }
    if (options.allow_mock) {
      return {
        mock: true,
        template_id: TEMPLATE_HEALTH,
        template_name: 'Template 1: Health Check (Read Only)',
        status: 'simulated_success',
        disarmed: true,
        timestamp: new Date().toISOString(),
      };
    }
    return await dispatchSemaphoreTask(TEMPLATE_HEALTH, { TRIGGERED_BY: 'ControlCenter_UI' });
  },

  // Deploy Backend trigger (Template 8 with immutable artifact & backup check)
  triggerSafeDeploy: async (confirmation, options = {}) => {
    // Disarm Enforcement (Audit Safety Requirement - Checked First)
    if (OPERATIONS_DISARMED && !options.allow_mock) {
      const err = new Error(DISARM_REASON);
      err.code = 'OPERATIONS_DISARMED';
      throw err;
    }

    if (!confirmation || confirmation.confirmed !== true) {
      throw new Error('Deploy requires explicit manual confirmation.');
    }

    const artifactName = confirmation.artifact_name;
    if (!artifactName || !/^fnmf-backend-test-[0-9a-fA-F]{7,40}_\d{8}_\d{6}\.jar$/.test(artifactName)) {
      throw new Error(`Invalid immutable artifact name '${artifactName}'. Must strictly match format: fnmf-backend-test-<commit>_<timestamp>.jar (cannot use latest.jar or destination filename).`);
    }

    const fullArtifactPath = path.join(BACKEND_ARTIFACT_DIR, artifactName);
    if (!fs.existsSync(fullArtifactPath)) {
      throw new Error(`Immutable artifact file not found on disk in ${BACKEND_ARTIFACT_DIR}: ${artifactName}`);
    }

    // Preflight Backup On-Disk Hash Re-computation & Verification Check
    const pgDetails = state.nodes.postgresql.details;
    if (!pgDetails.backup_verified || !pgDetails.backup_hash_matched) {
      throw new Error(`Preflight check failed: Database backup failed verification or SHA-256 hash mismatch (verified=${pgDetails.backup_verified}, hash_matched=${pgDetails.backup_hash_matched}).`);
    }

    if (options.allow_mock) {
      return {
        mock: true,
        validated: true,
        target_template_id: TEMPLATE_DEPLOY,
        template_name: 'Template 8: Deploy Backend Test',
        artifact: artifactName,
        artifact_path: fullArtifactPath,
        backup_verified: true,
        disarmed: true,
        message: 'MOCK VERIFIED: Preflight, Semaphore Template 8, and immutable build artifact validated successfully. Actual deployment remains disarmed.',
        timestamp: new Date().toISOString(),
      };
    }

    return await dispatchSemaphoreTask(TEMPLATE_DEPLOY, {
      TRIGGERED_BY: 'ControlCenter_UI',
      TARGET_JAR: fullArtifactPath,
      ACTIVATE_DEPLOY: 'true',
    });
  },
};

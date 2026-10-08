const express = require('express');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const telemetry = require('./telemetry');

const app = express();
const PORT = process.env.PORT || 4100;
const HOST = '127.0.0.1';
const ALLOWED_ORIGIN = `http://${HOST}:${PORT}`;

// Cryptographically random CSRF token for loopback protection
const SERVER_CSRF_TOKEN = crypto.randomBytes(32).toString('hex');

// Operator active session store (sessionToken -> { createdAt, expiresAt })
const operatorSessions = new Map();

app.use(express.json());

// Strict Origin Validation & Security Headers (NO WILDCARD CORS '*')
app.use((req, res, next) => {
  const origin = req.headers['origin'];
  if (origin) {
    if (origin === ALLOWED_ORIGIN || origin === `http://localhost:${PORT}`) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-FNMF-Control-Token, X-FNMF-Operator-Token');
    } else {
      // Reject cross-origin requests from external websites
      return res.status(403).json({
        error: 'FORBIDDEN_ORIGIN',
        message: `Cross-origin requests from external origin '${origin}' are blocked by security policy.`,
      });
    }
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Anti-CSRF Token Issuer (Only accessible by same-origin / loopback browser)
app.get('/api/auth/token', (req, res) => {
  const origin = req.headers['origin'];
  const host = req.headers['host'];
  if (origin && origin !== ALLOWED_ORIGIN && origin !== `http://localhost:${PORT}`) {
    return res.status(403).json({ error: 'FORBIDDEN_ORIGIN' });
  }
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) {
    return res.status(403).json({ error: 'FORBIDDEN_HOST' });
  }

  const opToken = req.headers['x-fnmf-operator-token'];
  let isOperator = false;
  if (opToken && operatorSessions.has(opToken)) {
    const s = operatorSessions.get(opToken);
    if (s.expiresAt > Date.now()) {
      isOperator = true;
    } else {
      operatorSessions.delete(opToken);
    }
  }

  res.json({
    token: SERVER_CSRF_TOKEN,
    csrf_token: SERVER_CSRF_TOKEN,
    role: isOperator ? 'OPERATOR' : 'OBSERVER',
    disarmed: telemetry.getTelemetryState().operations.disarmed,
    disarm_reason: telemetry.getTelemetryState().operations.disarm_reason,
  });
});

// Operator Login Endpoint (Strict Operator Authentication)
app.post('/api/auth/operator-login', (req, res) => {
  const host = req.headers['host'];
  const origin = req.headers['origin'];
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) {
    return res.status(403).json({ error: 'FORBIDDEN_HOST' });
  }
  if (origin && origin !== ALLOWED_ORIGIN && origin !== `http://localhost:${PORT}`) {
    return res.status(403).json({ error: 'FORBIDDEN_ORIGIN' });
  }

  // Anti-CSRF check
  const clientCsrfToken = req.headers['x-fnmf-control-token'];
  if (!clientCsrfToken || clientCsrfToken !== SERVER_CSRF_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_CSRF_TOKEN',
      message: 'Missing or invalid CSRF control token header.',
    });
  }

  const { operator_secret } = req.body || {};
  let realSecret = '';
  try {
    realSecret = config.getOperatorSecret();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'CONFIG_ERROR', message: err.message });
  }

  if (!operator_secret || typeof operator_secret !== 'string' || operator_secret !== realSecret) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_OPERATOR_SECRET',
      message: 'Khóa bí mật Người Vận Hành không chính xác.',
    });
  }

  // Generate 2-hour operator session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
  operatorSessions.set(sessionToken, {
    createdAt: Date.now(),
    expiresAt,
  });

  res.json({
    success: true,
    role: 'OPERATOR',
    operator_token: sessionToken,
    expires_at: new Date(expiresAt).toISOString(),
    message: 'Xác thực quyền Người Vận Hành thành công.',
  });
});

// Operator Logout Endpoint
app.post('/api/auth/operator-logout', (req, res) => {
  const opToken = req.headers['x-fnmf-operator-token'];
  if (opToken) {
    operatorSessions.delete(opToken);
  }
  res.json({
    success: true,
    role: 'OBSERVER',
    message: 'Đã hủy phiên làm việc của Người Vận Hành.',
  });
});

// Operator Session Check Endpoint
app.get('/api/auth/session', (req, res) => {
  const opToken = req.headers['x-fnmf-operator-token'];
  let isOperator = false;
  if (opToken && operatorSessions.has(opToken)) {
    const s = operatorSessions.get(opToken);
    if (s.expiresAt > Date.now()) {
      isOperator = true;
    } else {
      operatorSessions.delete(opToken);
    }
  }
  res.json({
    role: isOperator ? 'OPERATOR' : 'OBSERVER',
    csrf_token: SERVER_CSRF_TOKEN,
    disarmed: telemetry.getTelemetryState().operations.disarmed,
    disarm_reason: telemetry.getTelemetryState().operations.disarm_reason,
  });
});

// Middleware: Strict Operator Authentication & Anti-CSRF Mutation Guard
function requireOperatorAuth(req, res, next) {
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  const host = req.headers['host'];

  // 1. Host header validation
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN_HOST',
      message: `Invalid host header '${host}'. Expected '${HOST}:${PORT}'.`,
    });
  }

  // 2. Strict Origin / Referer validation (blocks malicious external web pages)
  if (origin && origin !== ALLOWED_ORIGIN && origin !== `http://localhost:${PORT}`) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN_CROSS_ORIGIN',
      message: 'Cross-origin requests from external websites are blocked.',
    });
  }
  if (referer && !referer.startsWith(ALLOWED_ORIGIN) && !referer.startsWith(`http://localhost:${PORT}`)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN_REFERER',
      message: 'Untrusted referer header blocked.',
    });
  }

  // 3. Anti-CSRF Token Header validation
  const clientCsrfToken = req.headers['x-fnmf-control-token'];
  if (!clientCsrfToken || clientCsrfToken !== SERVER_CSRF_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED_MUTATION',
      message: 'Missing or invalid X-FNMF-Control-Token header. Operation rejected.',
    });
  }

  // 4. Operator Session Token Authentication (Requires Operator Privilege)
  const operatorToken = req.headers['x-fnmf-operator-token'];
  if (!operatorToken || !operatorSessions.has(operatorToken)) {
    return res.status(401).json({
      success: false,
      error: 'OPERATOR_AUTH_REQUIRED',
      message: 'Thao tác yêu cầu xác thực quyền Người Vận Hành (Operator Authentication Required).',
    });
  }

  const session = operatorSessions.get(operatorToken);
  if (session.expiresAt <= Date.now()) {
    operatorSessions.delete(operatorToken);
    return res.status(401).json({
      success: false,
      error: 'OPERATOR_SESSION_EXPIRED',
      message: 'Phiên Người Vận Hành đã hết hạn. Vui lòng đăng nhập lại.',
    });
  }

  next();
}

// Telemetry API (Read Only - Accessible to Observers)
app.get('/api/telemetry', (req, res) => {
  res.json(telemetry.getTelemetryState());
});

// Service Status Check Endpoint (Read Only - Accessible to Observers)
app.get('/api/status/:service', (req, res) => {
  const current = telemetry.getTelemetryState();
  const node = current.nodes[req.params.service];
  // Audit Requirement: NOT_MEASURED is NOT healthy and must return 503
  const isHealthy = node.status === 'UP';
  res.status(isHealthy ? 200 : 503).json({
    id: node.id,
    title: node.title,
    status: node.status,
    latency_ms: node.latency_ms,
    measurement_source: node.measurement_source,
    last_check: node.last_check,
  });
});

// Simulation Drop Endpoint (Protected by Strict Operator Auth)
app.post('/api/simulate-disconnect', requireOperatorAuth, (req, res) => {
  const drop = req.body && typeof req.body.drop === 'boolean' ? req.body.drop : (req.query.drop === 'true');
  const updated = telemetry.setSimulateDrop(drop);
  res.json({ success: true, simulate_drop: drop, state: updated });
});

// Operations Trigger: Health Check (Template 1)
// Protected by Operator Auth & Disarmed per audit requirements
app.post('/api/ops/trigger-health', requireOperatorAuth, async (req, res) => {
  try {
    const result = await telemetry.triggerHealthCheck({ allow_mock: false });
    res.json({ success: true, result });
  } catch (err) {
    if (err.code === 'OPERATIONS_DISARMED') {
      return res.status(423).json({
        success: false,
        locked: true,
        error: 'OPERATIONS_DISARMED',
        message: err.message,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Operations Trigger: Deploy Backend (Template 8)
// Protected by Operator Auth & Disarmed per audit requirements
app.post('/api/ops/trigger-deploy', requireOperatorAuth, async (req, res) => {
  try {
    const confirmation = req.body;
    const result = await telemetry.triggerSafeDeploy(confirmation, { allow_mock: false });
    res.json({ success: true, result });
  } catch (err) {
    if (err.code === 'OPERATIONS_DISARMED') {
      return res.status(423).json({
        success: false,
        locked: true,
        error: 'OPERATIONS_DISARMED',
        message: err.message,
      });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// Mock Testing Endpoint (Protected by Operator Auth, Tests Validation without Actual Deploy)
app.post('/api/ops/mock-test', requireOperatorAuth, async (req, res) => {
  try {
    const action = req.body.action || 'deploy';
    if (action === 'health') {
      const result = await telemetry.triggerHealthCheck({ allow_mock: true });
      return res.json({ success: true, result });
    }
    const result = await telemetry.triggerSafeDeploy(req.body, { allow_mock: true });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Serve frontend build if exists
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));

app.get('*', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('FNMF Test Control Center Backend is running on port 4100. Frontend is building...');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[FNMF Control Center] Server listening at http://${HOST}:${PORT}`);
  console.log(`[Security] Operations disarmed: ${telemetry.getTelemetryState().operations.disarmed}`);
  console.log(`[Security] Anti-CSRF defense active. Operator auth required for all mutations.`);
});

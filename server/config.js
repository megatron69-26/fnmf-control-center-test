/**
 * FNMF Test Control Center - External Configuration Manager
 * 
 * Strict Audit Security Rules:
 * - NO SECRETS OR TOKENS STORED IN REPO OR COMMITTED TO GIT.
 * - Configuration loaded from external location (C:/Users/khoid/AppData/Local/fnmf-control-center/control-center.env)
 *   or gitignored local .env file.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
      }
    }
    return env;
  } catch (err) {
    console.error(`[Config] Failed reading ${filePath}:`, err.message);
    return {};
  }
}

const EXTERNAL_CONFIG_DIR = 'C:/Users/khoid/AppData/Local/fnmf-control-center';
const EXTERNAL_ENV_FILE = path.join(EXTERNAL_CONFIG_DIR, 'control-center.env');
const LOCAL_ENV_FILE = path.resolve(__dirname, '..', '.env');

// Merge priority: process.env > LOCAL_ENV_FILE > EXTERNAL_ENV_FILE
const externalEnv = parseEnvFile(EXTERNAL_ENV_FILE);
const localEnv = parseEnvFile(LOCAL_ENV_FILE);

const mergedConfig = {
  ...externalEnv,
  ...localEnv,
  ...process.env,
};

// Check or generate OPERATOR_SECRET if missing
if (!mergedConfig.OPERATOR_SECRET) {
  mergedConfig.OPERATOR_SECRET = crypto.randomBytes(24).toString('hex');
  try {
    if (!fs.existsSync(EXTERNAL_CONFIG_DIR)) {
      fs.mkdirSync(EXTERNAL_CONFIG_DIR, { recursive: true });
    }
    fs.appendFileSync(EXTERNAL_ENV_FILE, `OPERATOR_SECRET=${mergedConfig.OPERATOR_SECRET}\n`, 'utf8');
    if (fs.existsSync(LOCAL_ENV_FILE)) {
      fs.appendFileSync(LOCAL_ENV_FILE, `OPERATOR_SECRET=${mergedConfig.OPERATOR_SECRET}\n`, 'utf8');
    }
  } catch (err) {
    console.warn('[Config] Could not persist generated OPERATOR_SECRET:', err.message);
  }
}

function getSemaphoreToken() {
  const token = mergedConfig.SEMAPHORE_TOKEN || process.env.SEMAPHORE_TOKEN;
  if (!token) {
    throw new Error('SEMAPHORE_TOKEN is not configured in external configuration or environment variables.');
  }
  return token;
}

function getOperatorSecret() {
  return mergedConfig.OPERATOR_SECRET || '';
}

module.exports = {
  getSemaphoreToken,
  getOperatorSecret,
  EXTERNAL_ENV_FILE,
  LOCAL_ENV_FILE,
};

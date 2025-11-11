import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_FILE = join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

const LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toLowerCase() : 'info';
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';

const levelPriority = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const shouldLog = (level) => {
  const current = levelPriority[LOG_LEVEL] ?? levelPriority.info;
  const target = levelPriority[level] ?? levelPriority.info;
  return target <= current;
};

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const output = (level, message) => {
  if (!shouldLog(level)) return;
  const formatted = formatMessage(level, message);
  // Console output
  if (level === 'error') console.error(formatted);
  else if (level === 'warn') console.warn(formatted);
  else if (level === 'debug') console.debug(formatted);
  else console.log(formatted);

  // File output
  if (LOG_TO_FILE) {
    logStream.write(formatted + '\n');
  }
};

const logger = {
  error: (msg) => output('error', typeof msg === 'object' ? JSON.stringify(msg) : String(msg)),
  warn: (msg) => output('warn', typeof msg === 'object' ? JSON.stringify(msg) : String(msg)),
  info: (msg) => output('info', typeof msg === 'object' ? JSON.stringify(msg) : String(msg)),
  debug: (msg) => output('debug', typeof msg === 'object' ? JSON.stringify(msg) : String(msg)),
};

export default logger;

/**
 * ChainForge Logger
 * Минимальный логгер — без внешних зависимостей.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: '[DBG]',
  info: '[INF]',
  warn: '[WRN]',
  error: '[ERR]',
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function log(level: LogLevel, message: string, data?: unknown): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[currentLevel]) return;

  const timestamp = new Date().toISOString();
  const prefix = LEVEL_PREFIX[level];
  const line = `${timestamp} ${prefix} ${message}`;

  if (level === 'error') {
    console.error(line, data !== undefined ? data : '');
  } else if (level === 'warn') {
    console.warn(line, data !== undefined ? data : '');
  } else {
    console.log(line, data !== undefined ? data : '');
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
};

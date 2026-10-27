/**
 * Structured logger. Writes newline-delimited JSON to stdout and keeps a
 * short in-memory ring for the About and diagnostics panel. Never throws and
 * never writes secrets or user text payloads at info level and below. The
 * level is set from the YAKO_LOG_LEVEL environment variable.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  readonly [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const RING_CAPACITY = 200;

export interface LogRecord {
  readonly ts: string;
  readonly level: LogLevel;
  readonly msg: string;
  readonly context: string;
  readonly fields?: LogFields;
}

function resolveLevel(): LogLevel {
  const raw = (process.env['YAKO_LOG_LEVEL'] ?? 'info').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return 'info';
}

export class Logger {
  private static ring: LogRecord[] = [];
  private static minLevel: LogLevel = resolveLevel();

  private constructor(private readonly context: string) {}

  static forContext(context: string): Logger {
    return new Logger(context);
  }

  static setLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  static recent(limit = 50): readonly LogRecord[] {
    return Logger.ring.slice(-limit);
  }

  private emit(level: LogLevel, msg: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[Logger.minLevel]) {
      return;
    }
    const record: LogRecord = {
      ts: new Date().toISOString(),
      level,
      msg,
      context: this.context,
      ...(fields ? { fields } : {}),
    };
    Logger.ring.push(record);
    if (Logger.ring.length > RING_CAPACITY) {
      Logger.ring.splice(0, Logger.ring.length - RING_CAPACITY);
    }
    const line = JSON.stringify(record);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }

  debug(msg: string, fields?: LogFields): void {
    this.emit('debug', msg, fields);
  }

  info(msg: string, fields?: LogFields): void {
    this.emit('info', msg, fields);
  }

  warn(msg: string, fields?: LogFields): void {
    this.emit('warn', msg, fields);
  }

  error(msg: string, fields?: LogFields): void {
    this.emit('error', msg, fields);
  }
}

/**
 * Thin local HTTP server. Serves the static web UI from public/ and the JSON
 * API from /api/*. Uses only Node's built-in http module so there are no web
 * framework dependencies and the whole app stays offline and auditable.
 *
 * Routes
 *   GET  /                  the single-page UI
 *   GET  /api/health        pipeline state and loaded model slots
 *   GET  /api/meta          languages, models, total download size
 *   GET  /api/metrics       timing spans, counters, peak memory
 *   POST /api/translate     text translation, optional speech
 *   POST /api/swap          direction swap helper
 */
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import type { Orchestrator } from '../pipeline/orchestrator.js';
import { describeError, toYakoError } from '../pipeline/errors.js';
import {
  handleTranslate,
  handleSwap,
  handleHealth,
  handleMetrics,
  handleMeta,
  handleVoice,
} from './api.js';
import { Logger } from '../observability/logger.js';

const log = Logger.forContext('server');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function sendError(res: ServerResponse, error: unknown): void {
  const mapped = toYakoError(error);
  const { title, hint } = describeError(mapped.code);
  const status = mapped.code === 'INVALID_STATE' ? 400 : 500;
  sendJson(res, status, {
    ok: false,
    error: { code: mapped.code, message: mapped.message, title, hint },
  });
}

async function serveStatic(
  res: ServerResponse,
  publicDir: string,
  urlPath: string,
): Promise<boolean> {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(publicDir, safe);
  if (!filePath.startsWith(publicDir)) {
    return false;
  }
  try {
    const data = await readFile(filePath);
    const type = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

export interface RunningServer {
  readonly server: Server;
  readonly port: number;
  close(): Promise<void>;
}

export function startServer(
  orchestrator: Orchestrator,
  publicDir: string,
  port: number,
): Promise<RunningServer> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    try {
      if (path === '/api/health' && req.method === 'GET') {
        sendJson(res, 200, handleHealth(orchestrator));
        return;
      }
      if (path === '/api/meta' && req.method === 'GET') {
        sendJson(res, 200, handleMeta());
        return;
      }
      if (path === '/api/metrics' && req.method === 'GET') {
        sendJson(res, 200, handleMetrics());
        return;
      }
      if (path === '/api/translate' && req.method === 'POST') {
        const body = await readBody(req);
        sendJson(res, 200, await handleTranslate(orchestrator, body));
        return;
      }
      if (path === '/api/voice' && req.method === 'POST') {
        const body = await readBody(req);
        sendJson(res, 200, await handleVoice(orchestrator, body));
        return;
      }
      if (path === '/api/swap' && req.method === 'POST') {
        const body = await readBody(req);
        sendJson(res, 200, handleSwap(body));
        return;
      }
      if (req.method === 'GET' && (await serveStatic(res, publicDir, path))) {
        return;
      }
      sendJson(res, 404, {
        ok: false,
        error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${path}` },
      });
    } catch (error) {
      log.error('request failed', { path, error: String(error) });
      sendError(res, error);
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      log.info('server listening', { port: actualPort });
      resolve({
        server,
        port: actualPort,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

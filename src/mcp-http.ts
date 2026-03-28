#!/usr/bin/env node
/**
 * Remote MCP server over HTTP/SSE.
 * Clients connect via GET /sse (SSE stream) and POST /messages?sessionId=... (JSON-RPC).
 *
 * Usage:
 *   npx mcp-jobs-server
 *   MCP_JOBS_PORT=6000 npx mcp-jobs-server
 *
 * Client: use MCP SSE transport with URL http://<host>:<port>/sse
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './mcp-impl';

dotenv.config();

const PORT = parseInt(process.env.MCP_JOBS_PORT || '6000', 10);
const HOST = process.env.MCP_JOBS_HOST || '0.0.0.0';

// Map sessionId -> transport for routing POST /messages
const transports: { [sessionId: string]: SSEServerTransport } = {};

const app = express();
app.use(cors());

// Health / readiness
app.get('/', (_: Request, res: Response) => {
  res.json({ name: 'mcp-jobs', mode: 'sse', ok: true });
});

app.get('/health', (_: Request, res: Response) => {
  res.json({ ok: true });
});

// SSE: one transport per GET /sse; connect() calls transport.start()
app.get('/sse', async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  const server = createServer();
  await server.connect(transport);
  server.sendLoggingMessage({ level: 'info', data: '职位搜索服务(SSE)会话已建立' });
});

// POST /messages?sessionId=... — body: JSON-RPC 2.0 message (raw body; handlePostMessage uses getRawBody when parsedBody omitted)
app.post('/messages', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).send('No transport found for sessionId');
    return;
  }
  transport.handlePostMessage(req, res).catch((err: unknown) => {
    console.error('[mcp-http] handlePostMessage error:', err);
    if (!res.headersSent) res.status(500).send(String(err));
  });
});

const server = app.listen(PORT, HOST, () => {
  console.error(`[mcp-jobs] Remote MCP server (SSE) at http://${HOST}:${PORT}`);
  console.error(`[mcp-jobs]   GET  /sse      -> open SSE connection`);
  console.error(`[mcp-jobs]   POST /messages?sessionId=... -> send JSON-RPC`);
  console.error(`[mcp-jobs]   Client URL: http://<host>:${PORT}/sse`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[mcp-jobs] 错误: 端口 ${PORT} 已被占用`);
    console.error(`[mcp-jobs] 解决方案:`);
    console.error(`[mcp-jobs]   1. 停止占用端口的进程: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`[mcp-jobs]   2. 或使用其他端口: MCP_JOBS_PORT=6001 npx -y mcp-jobs-server`);
    console.error(`[mcp-jobs]   3. 检查是否有其他 mcp-jobs 服务器在运行: ps aux | grep mcp-http`);
    process.exit(1);
  } else {
    console.error(`[mcp-jobs] 服务器启动失败:`, err);
    process.exit(1);
  }
});

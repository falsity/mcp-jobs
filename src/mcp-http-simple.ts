#!/usr/bin/env node
/**
 * Remote MCP server over simple HTTP POST.
 * Compatible with MultiServerMCPClient using "http" transport.
 *
 * Usage:
 *   npx mcp-jobs-server-http
 *   MCP_JOBS_PORT=6000 npx mcp-jobs-server-http
 *
 * Client: use MCP HTTP transport with URL http://<host>:<port>/mcp
 * 
 * Example:
 *   {
 *     "transport": "http",
 *     "url": "http://localhost:6000/mcp"
 *   }
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { createServer, SEARCH_JOB_TOOL, JOB_DETAIL_TOOL } from './mcp-impl';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

dotenv.config();

const PORT = parseInt(process.env.MCP_JOBS_PORT || '6000', 10);
const HOST = process.env.MCP_JOBS_HOST || '0.0.0.0';

// Map sessionId -> server instance
interface Session {
  server: ReturnType<typeof createServer>;
  createdAt: number;
}

const sessions: { [sessionId: string]: Session } = {};

// Cleanup old sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  for (const [sessionId, session] of Object.entries(sessions)) {
    if (now - session.createdAt > oneHour) {
      delete sessions[sessionId];
    }
  }
}, 5 * 60 * 1000);

const app = express();
app.use(cors({
  exposedHeaders: ['Mcp-Session-Id'],
}));
app.use(express.json());

// Health / readiness
app.get('/', (_: Request, res: Response) => {
  res.json({ name: 'mcp-jobs', mode: 'http', ok: true });
});

app.get('/health', (_: Request, res: Response) => {
  res.json({ ok: true });
});

// Helper to check if request is initialize
function isInitializeRequest(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const req = body as { method?: string };
  return req.method === 'initialize';
}

// Helper to get or create session
function getOrCreateSession(sessionId: string | undefined, reqBody: unknown): { sessionId: string; server: ReturnType<typeof createServer> } {
  // If session exists, return it
  if (sessionId && sessions[sessionId]) {
    return { sessionId, server: sessions[sessionId].server };
  }
  
  // If initialize request, create new session (with or without provided sessionId)
  if (isInitializeRequest(reqBody)) {
    const newSessionId = sessionId || randomUUID();
    const server = createServer();
    sessions[newSessionId] = {
      server,
      createdAt: Date.now(),
    };
    return { sessionId: newSessionId, server };
  }
  
  // For non-initialize requests, session must exist
  if (!sessionId || !sessions[sessionId]) {
    throw new Error('Invalid session');
  }
  
  return { sessionId, server: sessions[sessionId].server };
}

// Main MCP endpoint - handles POST (messages)
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const { sessionId: finalSessionId, server } = getOrCreateSession(sessionId, req.body);
    
    // Set session ID header for client
    res.setHeader('Mcp-Session-Id', finalSessionId);
    
    // Handle the request using server's protocol
    const message = req.body;
    
    if (typeof message !== 'object' || message === null) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
      return;
    }
    
    // Use server's request handler
    if ('method' in message && 'id' in message) {
      const request = message as { method: string; id: unknown; params?: unknown };
      
      try {
        let result;
        
        if (request.method === 'initialize') {
          const initRequest = InitializeRequestSchema.parse(request);
          // Initialize returns server info
          result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              logging: {},
            },
            serverInfo: {
              name: 'mcp-jobs',
              version: '1.4.0',
            },
          };
        } else if (request.method === 'tools/list') {
          // Parse and call the handler using the Server's request handling mechanism
          try {
            const listRequest = ListToolsRequestSchema.parse(request);
            // Try to access the handler through the server's internal structure
            const serverAny = server as any;
            // MCP SDK Server stores handlers in _requestHandlers Map
            // The key might be the schema class or a string identifier
            const handlers = serverAny._requestHandlers;
            if (handlers && typeof handlers.get === 'function') {
              // Try different key formats that MCP SDK might use
              let handler = handlers.get('tools/list');
              if (!handler) {
                // Try with the schema class as key
                handler = handlers.get(ListToolsRequestSchema);
              }
              if (!handler) {
                // Try with schema name
                handler = handlers.get('ListToolsRequest');
              }
              if (handler) {
                result = await handler(listRequest, { signal: new AbortController().signal });
              } else {
                // Fallback: return tools directly using imported tool definitions
                console.warn('[mcp-http] Handler not found, using direct tool list');
                result = { tools: [SEARCH_JOB_TOOL, JOB_DETAIL_TOOL] };
              }
            } else {
              // Fallback: return tools directly using imported tool definitions
              console.warn('[mcp-http] Handlers map not accessible, using direct tool list');
              result = { tools: [SEARCH_JOB_TOOL, JOB_DETAIL_TOOL] };
            }
          } catch (parseError) {
            console.error('[mcp-http] Parse error for tools/list:', parseError);
            result = { error: { code: -32602, message: 'Invalid params', data: parseError instanceof Error ? parseError.message : String(parseError) } };
          }
        } else if (request.method === 'tools/call') {
          // Parse and call the handler using the Server's request handling mechanism
          try {
            const callRequest = CallToolRequestSchema.parse(request);
            const serverAny = server as any;
            const handlers = serverAny._requestHandlers;
            if (handlers && typeof handlers.get === 'function') {
              // Try different key formats
              let handler = handlers.get('tools/call');
              if (!handler) {
                handler = handlers.get(CallToolRequestSchema);
              }
              if (!handler) {
                handler = handlers.get('CallToolRequest');
              }
              if (handler) {
                result = await handler(callRequest, { signal: new AbortController().signal });
              } else {
                console.error('[mcp-http] Handler not found for tools/call');
                result = { error: { code: -32601, message: 'Handler not found' } };
              }
            } else {
              console.error('[mcp-http] Handlers map not accessible for tools/call');
              result = { error: { code: -32601, message: 'Handler not found' } };
            }
          } catch (parseError) {
            console.error('[mcp-http] Parse error for tools/call:', parseError);
            result = { error: { code: -32602, message: 'Invalid params', data: parseError instanceof Error ? parseError.message : String(parseError) } };
          }
        } else if (request.method === 'notifications/initialized') {
          // Notification - no response needed
          res.status(202).json({ accepted: true });
          return;
        } else {
          result = { error: { code: -32601, message: 'Method not found' } };
        }
        
        // Wrap result in proper JSON-RPC response format
        res.json({
          jsonrpc: '2.0',
          id: request.id,
          result: result,
        });
      } catch (error) {
        console.error('[mcp-http] Request error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } else {
      // Notification (no response needed)
      res.status(202).json({ accepted: true });
    }
  } catch (error) {
    console.error('[mcp-http] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

// GET endpoint for SSE stream (optional, for notifications)
app.get('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions[sessionId]) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Mcp-Session-Id', sessionId);
  
  // Send keepalive
  res.write(': keepalive\n\n');
  
  req.on('close', () => {
    // Connection closed
  });
});

// DELETE endpoint to close session
app.delete('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
    res.status(200).json({ ok: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.error(`[mcp-jobs] Remote MCP server (HTTP) at http://${HOST}:${PORT}`);
  console.error(`[mcp-jobs]   POST   /mcp      -> send JSON-RPC messages`);
  console.error(`[mcp-jobs]   GET    /mcp      -> SSE stream (optional)`);
  console.error(`[mcp-jobs]   DELETE /mcp      -> close session`);
  console.error(`[mcp-jobs]   Client URL: http://<host>:${PORT}/mcp`);
  console.error(`[mcp-jobs]   Compatible with MultiServerMCPClient: {"transport": "http", "url": "http://localhost:${PORT}/mcp"}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[mcp-jobs] 错误: 端口 ${PORT} 已被占用`);
    console.error(`[mcp-jobs] 解决方案:`);
    console.error(`[mcp-jobs]   1. 停止占用端口的进程: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`[mcp-jobs]   2. 或使用其他端口: MCP_JOBS_PORT=6001 npx -y mcp-jobs-server-http`);
    console.error(`[mcp-jobs]   3. 检查是否有其他 mcp-jobs 服务器在运行: ps aux | grep mcp-http`);
    process.exit(1);
  } else {
    console.error(`[mcp-jobs] 服务器启动失败:`, err);
    process.exit(1);
  }
});

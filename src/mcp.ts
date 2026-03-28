#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { createServer } from './mcp-impl';

dotenv.config();

async function runServer() {
  try {
    console.error('正在初始化职位搜索服务...');
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    server.sendLoggingMessage({ level: 'info', data: '职位搜索服务初始化成功' });
    console.error('职位搜索服务已启动，正在运行中...');
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

runServer().catch((error: unknown) => {
  console.error('服务器运行出错:', error);
  process.exit(1);
});

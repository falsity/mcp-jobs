/**
 * Shared MCP server factory: tools, handlers, and createServer().
 * Used by both stdio (mcp.ts) and HTTP/SSE (mcp-http.ts) entrypoints.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { searchJobList, crawlJobDetail, SearchParams } from './index';

// Tool definitions
export const SEARCH_JOB_TOOL: Tool = {
  name: 'mcp_search_job',
  description: '搜索职位信息，包括职位名称、公司名称、薪资范围、工作地点、发布时间等。',
  inputSchema: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: '搜索关键词' },
      city: { type: 'string', description: '城市名称' },
      salary: { type: 'string', description: '薪资范围' },
      workYear: { type: 'string', description: '工作经验' },
      page: { type: 'number', description: '页码' },
    },
    required: ['keyword'],
  },
};

export const JOB_DETAIL_TOOL: Tool = {
  name: 'mcp_job_detail',
  description: '获取职位详情信息，包括职位名称、公司名称、薪资范围、工作地点、发布时间等。',
  inputSchema: {
    type: 'object',
    properties: { url: { type: 'string', description: '职位详情页URL' } },
    required: ['url'],
  },
};

type SearchJobParams = SearchParams & { keyword: string };
interface JobDetailParams { url: string; }

// Allow page as number or numeric string (JSON/HTTP often sends numbers as strings)
function isValidSearchJobParams(args: unknown): args is SearchJobParams & { page?: number | string } {
  if (typeof args !== 'object' || args === null || !('keyword' in args)) return false;
  if (typeof (args as { keyword: unknown }).keyword !== 'string') return false;
  if ('city' in args && (args as { city: unknown }).city !== undefined && typeof (args as { city: unknown }).city !== 'string') return false;
  if ('page' in args && (args as { page: unknown }).page !== undefined) {
    const p = (args as { page: unknown }).page;
    if (typeof p !== 'number' && typeof p !== 'string') return false;
    if (typeof p === 'string' && (p === '' || Number.isNaN(Number(p)))) return false;
  }
  return true;
}

function isValidJobDetailParams(args: unknown): args is JobDetailParams {
  return (
    typeof args === 'object' && args !== null && 'url' in args &&
    typeof (args as { url: unknown }).url === 'string'
  );
}

// Helper function to safely send logging messages (works in both stdio and HTTP modes)
// In HTTP mode, server is not connected to transport, so we use console with timestamp
function safeSendLoggingMessage(server: Server, level: 'info' | 'error', data: unknown): void {
  try {
    const serverAny = server as any;
    const ts = new Date().toISOString();
    // Check if server has a connected transport
    if (serverAny._transport && typeof serverAny._transport.isConnected === 'function' && serverAny._transport.isConnected()) {
      // Connected to transport (stdio mode), use sendLoggingMessage
      server.sendLoggingMessage({ level, data });
    } else {
      // Not connected (HTTP mode), use console with timestamp
      const prefix = level === 'error' ? '[ERROR]' : '[INFO]';
      console.error(`[${ts}] ${prefix}`, data);
    }
  } catch (e) {
    // Fallback to console if anything fails (with timestamp)
    const ts = new Date().toISOString();
    const prefix = level === 'error' ? '[ERROR]' : '[INFO]';
    console.error(`[${ts}] ${prefix}`, data);
  }
}

/** Creates a configured MCP Server (tools + handlers). Does not connect to any transport. */
export function createServer(): Server {
  const server = new Server(
    { name: 'mcp-jobs', version: '1.0.0' },
    { capabilities: { tools: {}, logging: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [SEARCH_JOB_TOOL, JOB_DETAIL_TOOL],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const startTime = Date.now();
    try {
      const { name, arguments: args } = request.params;
      safeSendLoggingMessage(server, 'info', `[${new Date().toISOString()}] 收到工具调用请求: ${name}`);
      if (!args) throw new Error('未提供调用参数');

      switch (name) {
        case 'mcp_search_job': {
          if (!isValidSearchJobParams(args)) throw new Error('搜索职位的参数格式无效，请检查输入参数');
          const { keyword, city, salary, workYear } = args;
          const page = args.page !== undefined ? (typeof args.page === 'string' ? Number(args.page) : args.page) : undefined;
          safeSendLoggingMessage(server, 'info', `开始搜索职位，关键词: ${keyword}, 城市: ${city || '全国'}, 页码: ${page ?? 1}`);
          try {
            const { jobs: results, bySite, siteDiagnostics } = await searchJobList({ keyword, city, page, salary, workYear });
            safeSendLoggingMessage(server, 'info', `搜索完成，找到 ${results.length} 个职位，各站点: ${bySite.map(s => s.name + '=' + s.count).join(', ')}`);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    jobs: results,
                    metadata: {
                      totalResults: results.length,
                      searchParams: { keyword, city, page, salary, workYear },
                      bySite,
                      ...(siteDiagnostics && Object.keys(siteDiagnostics).length > 0 ? { siteDiagnostics } : {}),
                    },
                  }),
                },
              ],
              isError: false,
            };
          } catch (error) {
            safeSendLoggingMessage(server, 'error', `搜索失败: ${error instanceof Error ? error.message : String(error)}`);
            return { content: [{ type: 'text', text: JSON.stringify({ jobs: [], metadata: { totalResults: 0, searchParams: { keyword, city, page, salary, workYear }, bySite: [], error: '搜索服务暂时不可用，请稍后重试' } }) }], isError: false };
          }
        }
        case 'mcp_job_detail': {
          if (!isValidJobDetailParams(args)) throw new Error('获取职位详情的参数格式无效，请检查输入参数');
          const { url } = args;
          safeSendLoggingMessage(server, 'info', `开始获取职位详情，URL: ${url}`);
          try {
            const detail = await crawlJobDetail(url);
            if (!detail) return { content: [{ type: 'text', text: JSON.stringify({ jobDetail: null, metadata: { url, error: '未找到职位详情' } }) }], isError: false };
            safeSendLoggingMessage(server, 'info', `职位详情获取成功: ${detail.title || '未知职位'}`);
            return { content: [{ type: 'text', text: JSON.stringify({ jobDetail: detail, metadata: { url } }) }], isError: false };
          } catch (error) {
            safeSendLoggingMessage(server, 'error', `获取职位详情失败: ${error instanceof Error ? error.message : String(error)}`);
            return { content: [{ type: 'text', text: JSON.stringify({ jobDetail: null, metadata: { url }, error: '职位详情获取失败，请检查URL或稍后重试' }) }], isError: false };
          }
        }
        default:
          return { content: [{ type: 'text', text: `未知工具: ${name}` }], isError: true };
      }
    } catch (error) {
      safeSendLoggingMessage(server, 'error', { message: `请求失败: ${error instanceof Error ? error.message : String(error)}`, tool: request.params.name, arguments: request.params.arguments, timestamp: new Date().toISOString(), duration: Date.now() - startTime });
      return { content: [{ type: 'text', text: `错误: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    } finally {
      safeSendLoggingMessage(server, 'info', `请求处理完成，耗时 ${Date.now() - startTime}ms`);
    }
  });

  return server;
}

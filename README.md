# mcp-jobs

🚀 **零配置** 的多平台职位聚合服务！基于 MCP 架构，支持从主流招聘网站获取职位信息，**开箱即用，无需任何设置**。

[![NPM Version][npm-image]][npm-url]
[![Node.js Version][node-version-image]][node-version-url]
[![License][license-image]][license-url]

## ⚡ 30 秒快速开始

### 🚀 第一步：启动服务（零配置）

```bash
# 一行命令，立即启动
npx -y mcp-jobs
```

### 🤖 第二步：配置 AI 客户端

在您的 AI 客户端（如 Cursor、Claude Desktop）中添加：
- **服务名称**: `mcp-jobs`
- **命令**: `npx -y mcp-jobs`
- **环境变量**: 留空

### 💬 第三步：开始使用

直接向 AI 助手说：*"搜索北京的前端开发职位"*

**就这么简单！** 🎉 无需注册、无需 API Key、无需配置文件。

## 🌟 核心特性

- **🔓 零门槛**：无需 API Key，无需注册，无需配置
- **📦 开箱即用**：一行命令即可启动完整服务
- **🔍 智能搜索**：支持按职位名称、城市、薪资范围等条件筛选
- **🌐 多平台聚合**：自动从多个主流招聘网站获取数据
- **📊 标准化输出**：统一的数据格式，便于大模型处理
- **⚡ 实时更新**：保证职位信息的时效性
- **🔧 可选增强**：支持 API Key 解锁额外功能（完全可选）

## 📦 安装方式

### 🚀 即时运行（推荐）

**无需安装，无需配置，立即使用：**

```bash
# 一行命令，立即启动
npx -y mcp-jobs
```

### 🔧 全局安装（可选）

如果您需要频繁使用：

```bash
# 全局安装
npm install -g mcp-jobs

# 直接运行
mcp-jobs
```

### 📁 项目内安装（可选）

```bash
# 安装到项目依赖中
npm install mcp-jobs
# 或使用 yarn
yarn add mcp-jobs
# 或使用 pnpm
pnpm add mcp-jobs
```

## 🎯 使用说明

### 🚀 基础使用（零配置）

**无需任何设置，立即开始：**

```bash
# 启动服务
npx -y mcp-jobs

# 服务将自动提供以下功能：
# ✅ 职位搜索
# ✅ 职位详情获取
# ✅ 多平台数据聚合
# ✅ 标准化数据输出
```

**就是这么简单！** 

### 🔧 高级配置（完全可选）

如果您需要额外的增强功能，可以选择性配置以下参数：

```bash
# 可选：复制配置模板
cp .env.example .env

# 可选：编辑配置文件，取消注释您需要的功能
# USERNAME=your_username            # 可选：基础认证
# PASSWORD=your_password            # 可选：基础认证

# 可选：爬虫配置
# CRAWLER_HEADLESS=true             # 可选：无头模式 (调试时可设为 false)
# CRAWLER_TIMEOUT=30000             # 可选：页面超时时间 (毫秒)
# CRAWLER_VIEWPORT_WIDTH=1280       # 可选：浏览器视窗宽度
# CRAWLER_VIEWPORT_HEIGHT=800       # 可选：浏览器视窗高度
# CRAWLER_DEBUG=false               # 可选：调试模式
```

#### 可选配置说明

| 配置项 | 用途 | 是否必需 |
|--------|------|----------|
| `USERNAME` | 基础认证用户名 | ❌ 可选 |
| `PASSWORD` | 基础认证密码 | ❌ 可选 |
| `CRAWLER_HEADLESS` | 浏览器无头模式 (true/false) | ❌ 可选 |
| `CRAWLER_TIMEOUT` | 页面超时时间 (毫秒) | ❌ 可选 |
| `CRAWLER_VIEWPORT_WIDTH` | 浏览器视窗宽度 | ❌ 可选 |
| `CRAWLER_VIEWPORT_HEIGHT` | 浏览器视窗高度 | ❌ 可选 |
| `CRAWLER_DEBUG` | 调试模式 (true/false) | ❌ 可选 |

> 💡 **重要提示**：所有配置都是**完全可选的**。服务在没有任何配置的情况下提供完整的核心功能。

## 🤖 AI 客户端配置

### 🚀 Cursor 配置（零配置）

#### 最简配置（推荐）

1. 打开 Cursor 设置
2. 进入 Features > MCP Servers
3. 点击 "+ Add New MCP Server"
4. 输入以下信息：
   - **Name**: `mcp-jobs`
   - **Type**: `command`
   - **Command**: `npx -y mcp-jobs`



#### JSON 配置方式

**基础配置（开箱即用）：**

```json
{
  "mcpServers": {
    "mcp-jobs": {
      "command": "npx",
      "args": ["-y", "mcp-jobs"]
    }
  }
}
```

**高级配置（可选增强）：**

```json
{
  "mcpServers": {
    "mcp-jobs": {
      "command": "npx",
      "args": ["-y", "mcp-jobs"],
      "env": {
        "USERNAME": "your-username",
        "PASSWORD": "your-password"
      }
    }
  }
}
```

> 💡 **提示**：推荐使用基础配置，已提供完整的职位搜索功能！

### 🤖 Claude Desktop 配置

**零配置设置：**

1. 打开 Claude Desktop
2. 点击左下角 Settings 图标
3. 选择 "MCP Servers" 选项
4. 点击 "Add New Server"
5. 输入以下信息：
   - **Name**: `mcp-jobs`
   - **Type**: `command`
   - **Command**: `npx -y mcp-jobs`
   - **Environment Variables**: 留空（无需任何变量）

**就这样！** 无需 API Key，立即可用。

### 🚀 Windsurf 配置

**基础配置（零设置）：**

```json
{
  "mcpServers": {
    "mcp-jobs": {
      "command": "npx",
      "args": ["-y", "mcp-jobs"]
    }
  }
}
```

### 🚀 Cline 配置

**基础配置（零设置）：**

```yaml
mcp:
  servers:
    mcp-jobs:
      command: npx
      args: ["-y", "mcp-jobs"]
```


## 🔧 高级配置（完全可选）

> ⚠️ **重要提示**：以下所有配置都是**完全可选的**！服务在无任何配置的情况下即可提供完整功能。

如果您需要自定义服务行为，可以选择性配置以下环境变量：

```bash
# 可选：MCP API 密钥（用于解锁高级功能）
# 可选：基础认证
# USERNAME=your-username
# PASSWORD=your-password

# 可选：自定义 MCP 服务地址
```

> 💡 **再次提醒**：无需任何配置即可使用完整的职位搜索功能！

## 🎯 立即开始使用

配置完成后（只需一行命令！），您就可以通过自然语言向 AI 助手描述职位搜索需求：

### 💬 使用示例

**直接搜索职位：**
- "搜索上海地区的前端开发工程师职位"
- "查找北京的数据分析师岗位，要求 3 年以上经验"
- "找出杭州地区薪资最高的产品经理职位"

**获取职位详情：**
- "获取这个职位的详细信息：[职位链接]"
- "分析这个岗位的要求和薪资情况"

**智能分析：**
- "比较不同城市的同类职位薪资水平"
- "总结当前市场上热门的技能要求"

> 🚀 **零门槛体验**：无需学习复杂的 API 调用，直接用自然语言即可获得专业的职位搜索服务！

大模型会自动调用 mcp-jobs 服务获取相关信息并为您展示结果。

## 远程 MCP 服务

如需让**远端客户端**通过网络调用本机的 mcp-jobs（例如本机跑服务、其他机器上的 Cursor/Agent 连接），可启动远程服务。支持两种传输方式：

### 方式一：HTTP 传输（推荐，兼容 MultiServerMCPClient）

**启动服务：**

```bash
# 默认 http://0.0.0.0:6000
npx -y mcp-jobs-server-http

# 自定义端口与监听地址
MCP_JOBS_PORT=6000 MCP_JOBS_HOST=0.0.0.0 npx -y mcp-jobs-server-http
```

或安装后：

```bash
pnpm run server:http
# 或
npx mcp-jobs-server-http
```

**端点说明：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/mcp` | 发送 JSON-RPC 2.0 消息（主要端点） |
| GET | `/mcp` | SSE 流（可选，用于服务器通知） |
| DELETE | `/mcp` | 关闭会话 |
| GET | `/`, `/health` | 健康检查 |

**客户端连接（MultiServerMCPClient）：**

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "mcp_jobs": {
        "transport": "http",
        "url": "http://localhost:6000/mcp"
    }
})
```

**连接 URL**：`http://<服务器IP或域名>:<端口>/mcp`，例如 `http://192.168.1.100:6000/mcp`

---

### 方式二：SSE 传输（传统方式）

**启动服务：**

```bash
# 默认 http://0.0.0.0:6000
npx -y mcp-jobs-server

# 自定义端口与监听地址
MCP_JOBS_PORT=6000 MCP_JOBS_HOST=0.0.0.0 npx -y mcp-jobs-server
```

或安装后：

```bash
pnpm run server
# 或
npx mcp-jobs-server
```

**端点说明：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sse` | 建立 SSE 连接，服务端返回 `event: endpoint` 及 `sessionId` |
| POST | `/messages?sessionId=<id>` | 发送 JSON-RPC 2.0 消息，`sessionId` 来自 GET /sse |
| GET | `/`, `/health` | 健康检查 |

**客户端连接：**

- **连接 URL**：`http://<服务器IP或域名>:<端口>/sse`，例如 `http://192.168.1.100:6000/sse`
- 使用支持 **MCP over SSE** 的客户端

---

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `MCP_JOBS_PORT` | `6000` | HTTP 服务端口 |
| `MCP_JOBS_HOST` | `0.0.0.0` | 监听地址，`0.0.0.0` 表示允许外网访问 |

### 常见问题

**端口被占用错误：**

如果遇到 `EADDRINUSE: address already in use` 错误，说明端口已被占用。解决方案：

1. **停止占用端口的进程：**
   ```bash
   # 查找占用端口的进程
   lsof -ti:6000 | xargs kill -9
   
   # 或使用提供的脚本
   ./scripts/stop-servers.sh
   ```

2. **使用其他端口：**
   ```bash
   MCP_JOBS_PORT=6001 npx -y mcp-jobs-server-http
   ```

3. **检查是否有其他服务器在运行：**
   ```bash
   ps aux | grep mcp-http
   ```

> 若本机有防火墙，请放行 `MCP_JOBS_PORT`；生产环境建议配合反向代理与 HTTPS。

## 供 LangGraph / 其他 Agent 集成

若要在 **LangGraph** 或自建 Agent 中调用 mcp-jobs 的 `mcp_search_job`、`mcp_job_detail`：

1. 安装：`pip install langchain-mcp-adapters langgraph langchain-core`
2. 用 **stdio** 启动 mcp-jobs：`npx -y mcp-jobs` 或 `node /path/to/mcp-jobs/dist/mcp.js`
3. 在 **同一 `async with client.session("mcp_jobs")` 块内** 完成 `load_mcp_tools(session)` 与 `agent.ainvoke`，否则 stdio 进程会提前退出。

详细代码与两种接入方式（`create_react_agent` / 自建图）见：[**LANGGRAPH_INTEGRATION.md**](LANGGRAPH_INTEGRATION.md)。同仓库下的 [langgraph-mcp-jobs](../langgraph-mcp-jobs) 为可运行示例。

## 🔧 调试和开发

### 🐛 调试模式

如果您需要调试爬虫行为或开发新功能，可以启用调试模式：

```bash
# 启用可视化浏览器窗口（非无头模式）
CRAWLER_HEADLESS=false npx -y mcp-jobs

# 启用调试日志
CRAWLER_DEBUG=true npx -y mcp-jobs

# 组合使用
CRAWLER_HEADLESS=false CRAWLER_DEBUG=true npx -y mcp-jobs
```

### ⚙️ 自定义浏览器配置

```bash
# 自定义视窗大小
CRAWLER_VIEWPORT_WIDTH=1920 CRAWLER_VIEWPORT_HEIGHT=1080 npx -y mcp-jobs

# 增加超时时间（适用于慢速网络）
CRAWLER_TIMEOUT=60000 npx -y mcp-jobs

# 自定义用户代理
CRAWLER_USER_AGENT="Custom Bot 1.0" npx -y mcp-jobs
```

### 📝 配置优先级

配置的优先级从高到低：
1. **站点特定配置** - 在 `crawlerConfig.ts` 中为特定网站设置的 `browserConfig`
2. **环境变量** - 通过 `CRAWLER_*` 环境变量设置
3. **默认配置** - 系统默认值

### 🧪 如何测试 mcp-jobs 是否正常

**方式一：命令（Node）**

在 mcp-jobs 目录下执行（会启动子进程做 MCP 握手并列出工具，不依赖已运行的服务）：

```bash
# 只检查 initialize / tools/list
pnpm run test:mcp
# 或
node examples/test-mcp-cli.mjs

# 顺带调用一次 mcp_search_job
pnpm run test:mcp:search
# 或
node examples/test-mcp-cli.mjs --call-search
```

**方式二：Python（仅标准库，无需 pip 安装）**

在 mcp-jobs 目录下执行（需 Node 在 PATH 中）：

```bash
# 只检查 initialize / tools/list
python3 examples/test_mcp.py

# 顺带调用一次 mcp_search_job
python3 examples/test_mcp.py --call-search
```

**方式三：MCP Inspector（图形界面）**

```bash
npx @modelcontextprotocol/inspector npx -y mcp-jobs
```

在浏览器中打开提示的地址，可查看工具列表并手动调用 `mcp_search_job`、`mcp_job_detail`。

> 注意：上述测试会自行启动 mcp-jobs 子进程。若在 Cursor 等客户端里已配置 mcp-jobs，请勿同时在终端运行 `npx -y mcp-jobs`，否则会占用 stdio。

## 🌟 为什么选择 MCP Jobs？

### ✅ **真正的零门槛**
- 🚫 **无需注册账号** - 不用填写任何个人信息
- 🚫 **无需复杂配置** - 一行命令即可启动
- 🚫 **无需学习文档** - 直接用自然语言交互

### ⚡ **立即可用**
- 📦 开箱即用，无需任何准备工作
- 🔍 完整的职位搜索功能
- 🌐 多平台数据聚合
- 📊 标准化数据输出

### 🛡️ **可靠稳定**
- 🔄 自动重试机制
- ⚠️ 优雅的错误处理
- 📈 实时数据更新
- 🔧 可选的高级功能

## 📋 使用须知

1. **完全免费** - 核心功能无需任何费用
2. **遵守规范** - 请遵守各招聘平台的使用协议
3. **合理使用** - 建议控制请求频率，避免过度访问
4. **系统要求** - Node.js >= 16.0.0

## 开源协议

[MIT License](LICENSE)

## 获取帮助

如果您在使用过程中遇到任何问题，请通过以下方式获取帮助：

- 提交 [GitHub Issue](https://github.com/mergedao/mcp-jobs/issues)

[npm-image]: https://img.shields.io/npm/v/mcp-jobs.svg
[npm-url]: https://npmjs.org/package/mcp-jobs
[node-version-image]: https://img.shields.io/node/v/mcp-jobs.svg
[node-version-url]: https://nodejs.org/download/
[license-image]: https://img.shields.io/npm/l/mcp-jobs.svg
[license-url]: LICENSE

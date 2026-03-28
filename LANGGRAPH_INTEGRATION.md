# 在 LangGraph Agent 中使用 mcp-jobs

让任意 LangGraph 程序通过 MCP 调用 mcp-jobs 的 `mcp_search_job`、`mcp_job_detail` 工具。

---

## 1. 安装依赖

在 **你的 LangGraph 项目** 中：

```bash
pip install langchain-mcp-adapters langgraph langchain-core
# 若用 OpenAI 兼容的 LLM：
pip install langchain-openai
```

---

## 2. 准备 mcp-jobs

任选一种：

| 方式 | 说明 |
|------|------|
| **npx（推荐，无需克隆）** | 确保本机有 Node，运行时通过 `npx -y mcp-jobs` 拉取并启动 |
| **本地构建** | 克隆 mcp-jobs 后执行 `pnpm install && pnpm run build`，用 `node /path/to/mcp-jobs/dist/mcp.js` 启动 |

---

## 3. 在 Agent 里接入 mcp-jobs

### 方式 A：用 `MultiServerMCPClient` + `load_mcp_tools`（推荐）

```python
import asyncio
from pathlib import Path

from langchain_core.messages import HumanMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_openai import ChatOpenAI  # 或你的 LLM
from langgraph.prebuilt import create_react_agent

# ----- 配置 mcp-jobs：二选一 -----

# 选项 1：npx（无需本地 mcp-jobs 源码）
MCP_JOBS_CONFIG = {
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "mcp-jobs"],
}

# 选项 2：本地 dist/mcp.js（需先 build）
# MCP_JOBS_PATH = Path(__file__).resolve().parents[1] / "mcp-jobs" / "dist" / "mcp.js"
# MCP_JOBS_CONFIG = {
#     "transport": "stdio",
#     "command": "node",
#     "args": [str(MCP_JOBS_PATH)],
# }

# ----- 创建 MCP 客户端 -----
client = MultiServerMCPClient({
    "mcp_jobs": MCP_JOBS_CONFIG,
})

SYSTEM_PROMPT = """你是职位搜索助手。可用工具：
- mcp_search_job: 按 keyword（必填）、city、salary、workYear、page 搜索职位
- mcp_job_detail: 按 url 获取职位详情
用这些工具回答用户的求职相关问题。用用户同样的语言回复。"""


async def run(query: str) -> str:
    # 重要：整个 agent 的调用必须在同一 session 内，否则 stdio 进程会关闭
    async with client.session("mcp_jobs") as session:
        tools = await load_mcp_tools(session)
        model = ChatOpenAI(model="gpt-4o-mini")  # 或你的模型
        agent = create_react_agent(model, tools=tools, prompt=SYSTEM_PROMPT)
        result = await agent.ainvoke({"messages": [HumanMessage(content=query)]})
        msgs = result.get("messages", [])
        if msgs:
            last = msgs[-1]
            return last.content if hasattr(last, "content") else str(last)
    return ""

if __name__ == "__main__":
    out = asyncio.run(run("北京 测试工程师 第1页"))
    print(out)
```

### 方式 B：挂到你自己建的 LangGraph 图里

如果你不用 `create_react_agent`，而是手写 `StateGraph`：

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

client = MultiServerMCPClient({
    "mcp_jobs": {"transport": "stdio", "command": "npx", "args": ["-y", "mcp-jobs"]},
})

async def my_agent_with_mcp(user_input: str):
    async with client.session("mcp_jobs") as session:
        tools = await load_mcp_tools(session)
        # 把 tools 绑定到你的 LLM：model.bind_tools(tools)
        # 并在图节点里按需 call 工具、处理 ToolMessage
        # ...
```

要点：**`load_mcp_tools(session)` 和所有会调用这些工具的 `ainvoke`/节点执行，都要在同一个 `async with client.session("mcp_jobs") as session` 块里**。

---

## 4. 工具说明

| 工具 | 参数 | 说明 |
|------|------|------|
| `mcp_search_job` | `keyword`（必填）, `city`, `salary`, `workYear`, `page` | 多渠道职位搜索 |
| `mcp_job_detail` | `url`（必填） | 抓取职位详情页 |

---

## 5. 环境变量（可选）

- `MCP_JOBS_MCP_JS`：若用本地 mcp.js，可指向该路径，便于在代码里用 `os.environ.get("MCP_JOBS_MCP_JS")`。
- `OPENAI_API_KEY` / `OPENAI_API_BASE`：按你用的 LLM 配置。

---

## 6. 完整示例项目

同仓库下的 [langgraph-mcp-jobs](../langgraph-mcp-jobs) 是完整可跑示例，含 `agent.py` 和 `requirements.txt`，可直接参考或复制到你的项目：

```bash
cd langgraph-mcp-jobs
pip install -r requirements.txt
# 只测 MCP：RUN_MCP_ONLY=1 python agent.py
# 跑完整 agent：OPENAI_API_KEY=sk-... python agent.py "上海 后端"
```

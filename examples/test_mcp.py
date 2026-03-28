#!/usr/bin/env python3
"""
Test mcp-jobs MCP server over stdio (stdlib only, no extra deps).
Spawns mcp-jobs, sends initialize -> initialized -> tools/list,
optionally calls mcp_search_job.

Usage:
  python examples/test_mcp.py                    # list tools only
  python examples/test_mcp.py --call-search      # also call mcp_search_job (keyword=测试, city=北京)
  python examples/test_mcp.py --call-search -v   # more logs: request/response, metadata, sample jobs

  Env override: MCP_TEST_KEYWORD, MCP_TEST_CITY (e.g. MCP_TEST_KEYWORD=Python MCP_TEST_CITY=上海)

Requires: Node.js in PATH. Prefers ../dist/mcp.js if present, else npx -y mcp-jobs.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
MCP_JOBS_ROOT = SCRIPT_DIR.parent
DIST_MCP = MCP_JOBS_ROOT / "dist" / "mcp.js"

# Search params used when --call-search (can override via env or keep default)
DEFAULT_KEYWORD = "测试"
DEFAULT_CITY = "北京"


def pick_command():
    if DIST_MCP.exists():
        return ["node", str(DIST_MCP)]
    return ["npx", "-y", "mcp-jobs"]


def send(proc, obj):
    proc.stdin.write(json.dumps(obj) + "\n")
    proc.stdin.flush()


def read_response(proc, want_id):
    """Read stdout lines until we get a JSON-RPC message with id == want_id."""
    while True:
        line = proc.stdout.readline()
        if not line:
            raise RuntimeError("mcp-jobs process ended unexpectedly")
        line = line.rstrip("\n\r")
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(msg, dict):
            continue
        if msg.get("id") == want_id:
            return msg


def main():
    do_call_search = "--call-search" in sys.argv
    verbose = "-v" in sys.argv or "--verbose" in sys.argv
    keyword = os.environ.get("MCP_TEST_KEYWORD", DEFAULT_KEYWORD)
    city = os.environ.get("MCP_TEST_CITY", DEFAULT_CITY)

    cmd = pick_command()
    if verbose:
        print("[test] 启动 mcp-jobs:", " ".join(cmd), flush=True)
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        text=True,
        bufsize=1,
        cwd=str(MCP_JOBS_ROOT),
    )
    try:
        # 1) initialize
        req_id = 1
        req_init = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "mcp-jobs-test", "version": "1.0.0"},
            },
        }
        if verbose:
            print("[test] >> request: initialize", json.dumps(req_init.get("params"), ensure_ascii=False), flush=True)
        send(proc, req_init)
        init = read_response(proc, req_id)
        if init.get("error"):
            print("initialize error:", init["error"], file=sys.stderr)
            sys.exit(1)
        if verbose:
            r = init.get("result") or {}
            print("[test] << response: protocolVersion=%s, server=%s" % (r.get("protocolVersion"), r.get("serverInfo", {}).get("name")), flush=True)
        print("ok: initialize")

        # 2) notifications/initialized
        send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized"})
        print("ok: notifications/initialized")

        # 3) tools/list
        req_id = 2
        if verbose:
            print("[test] >> request: tools/list", flush=True)
        send(proc, {"jsonrpc": "2.0", "id": req_id, "method": "tools/list"})
        lst = read_response(proc, req_id)
        if lst.get("error"):
            print("tools/list error:", lst["error"], file=sys.stderr)
            sys.exit(1)
        tools = lst.get("result", {}).get("tools", [])
        names = [t.get("name") for t in tools]
        if verbose:
            print("[test] << response: %d tools, names=%s" % (len(tools), names), flush=True)
        print("ok: tools/list ->", names)
        if "mcp_search_job" not in names or "mcp_job_detail" not in names:
            print("expected mcp_search_job and mcp_job_detail", file=sys.stderr)
            sys.exit(1)

        if do_call_search:
            req_id = 3
            call_args = {"keyword": keyword, "city": city}
            req_call = {
                "jsonrpc": "2.0",
                "id": req_id,
                "method": "tools/call",
                "params": {"name": "mcp_search_job", "arguments": call_args},
            }
            print("[test] >> mcp_search_job 请求: keyword=%s, city=%s" % (keyword, city), flush=True)
            if verbose:
                print("[test]     full params:", json.dumps(req_call, ensure_ascii=False, indent=2), flush=True)
            send(proc, req_call)
            call = read_response(proc, req_id)
            if call.get("error"):
                print("tools/call mcp_search_job error:", call["error"], file=sys.stderr)
                sys.exit(1)
            result = call.get("result")
            if isinstance(result, list):
                content = result
            elif isinstance(result, dict):
                content = result.get("content") if isinstance(result.get("content"), list) else []
            else:
                content = []
            item = content[0] if content else None
            text = item.get("text") if isinstance(item, dict) else None
            try:
                data = json.loads(text) if isinstance(text, str) else None
            except json.JSONDecodeError:
                data = None
            jobs = data.get("jobs", []) if isinstance(data, dict) else []
            meta = data.get("metadata", {}) if isinstance(data, dict) else {}
            n = len(jobs)
            print("ok: tools/call mcp_search_job -> jobs count =", n)

            # Extra logs: metadata, bySite (per-URL counts), and sample jobs
            print("[test] metadata: totalResults=%s, searchParams=%s" % (meta.get("totalResults", n), meta.get("searchParams", {})), flush=True)
            by_site = meta.get("bySite") or []
            if by_site:
                print("[test] 各站点: %s" % ", ".join("%s=%d" % (s.get("name", ""), s.get("count", 0)) for s in by_site), flush=True)
            if jobs:
                sample = [str(j.get("title") or j.get("company") or "(no title)") for j in jobs[:5]]
                print("[test] 前 5 条职位: %s" % sample, flush=True)
            if verbose and isinstance(text, str):
                print("[test] content[0].text 长度: %d 字符" % len(text), flush=True)
            if verbose and meta.get("error"):
                print("[test] 响应中的 error 字段: %s" % meta.get("error"), flush=True)

        print("\n[mcp-jobs] All checks passed.")
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)
    finally:
        proc.terminate()
        proc.wait(timeout=5)


if __name__ == "__main__":
    main()

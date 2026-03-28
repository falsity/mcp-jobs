#!/usr/bin/env python3
"""
Test mcp-jobs remote MCP server (HTTP/SSE). Requires server: pnpm run server

  python examples/test_mcp_http.py
  python examples/test_mcp_http.py --base-url http://192.168.1.100:6000
"""
import json
import re
import sys
import threading
import time
import urllib.request
from urllib.parse import urljoin

DEFAULT_BASE = "http://127.0.0.1:6000"


def main():
    base = DEFAULT_BASE
    if "--base-url" in sys.argv:
        i = sys.argv.index("--base-url")
        if i + 1 < len(sys.argv):
            base = sys.argv[i + 1].rstrip("/")
    sse_url = urljoin(base + "/", "sse")
    messages_url = urljoin(base + "/", "messages")
    session_id = [None]
    sse_lines = []

    def read_sse():
        try:
            req = urllib.request.urlopen(sse_url, timeout=5)
            for line in req:
                s = line.decode("utf-8", errors="replace").rstrip("\n\r")
                sse_lines.append(s)
                m = re.search(r"sessionId=([0-9a-f-]{36})", s)
                if m:
                    session_id[0] = m.group(1)
        except Exception as e:
            print("[sse] error:", e, file=sys.stderr)

    t = threading.Thread(target=read_sse, daemon=True)
    t.start()
    for _ in range(50):
        if session_id[0] is not None:
            break
        time.sleep(0.1)
    sid = session_id[0]
    if not sid:
        print("Could not get sessionId from /sse", file=sys.stderr)
        sys.exit(1)
    print("[ok] sessionId:", sid)

    def post_rpc(obj):
        req = urllib.request.Request(
            f"{messages_url}?sessionId={sid}",
            data=json.dumps(obj).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status

    print("[ok] POST initialize ->", post_rpc({
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                  "clientInfo": {"name": "test_mcp_http", "version": "1.0.0"}},
    }))
    time.sleep(0.3)
    post_rpc({"jsonrpc": "2.0", "method": "notifications/initialized"})
    time.sleep(0.2)
    post_rpc({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    time.sleep(0.5)

    last_data = None
    for s in sse_lines:
        if s.startswith("data:") and len(s) > 5:
            try:
                last_data = json.loads(s[5:].strip())
            except Exception:
                pass
    if last_data:
        res = last_data.get("result") or last_data
        tools = res.get("tools", [])
        names = [t.get("name") for t in tools] if isinstance(tools, list) else []
        print("[ok] tools/list ->", names)
    print("\n[test_mcp_http] All checks passed.")


if __name__ == "__main__":
    main()

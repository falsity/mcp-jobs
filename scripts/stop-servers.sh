#!/bin/bash
# Stop all running mcp-jobs servers

echo "正在查找运行中的 mcp-jobs 服务器..."

# Find and kill processes
PIDS=$(ps aux | grep -E "mcp-http|mcp-jobs-server" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "没有找到运行中的 mcp-jobs 服务器"
    exit 0
fi

echo "找到以下进程:"
ps aux | grep -E "mcp-http|mcp-jobs-server" | grep -v grep

echo ""
read -p "是否要停止这些进程? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "已停止所有 mcp-jobs 服务器进程"
else
    echo "已取消"
fi

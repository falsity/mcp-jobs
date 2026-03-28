#!/bin/bash
# Fix firewall for MCP server remote access
# This script helps configure firewall to allow remote access to MCP server

PORT=${MCP_JOBS_PORT:-6000}
HOST=${MCP_JOBS_HOST:-0.0.0.0}

echo "=========================================="
echo "MCP 服务器防火墙配置工具"
echo "=========================================="
echo "端口: $PORT"
echo "监听地址: $HOST"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠ 此脚本需要 root 权限来配置防火墙"
    echo "请使用: sudo $0"
    echo ""
    echo "或者手动运行以下命令:"
    echo ""
    
    # Detect firewall type
    if command -v ufw &> /dev/null; then
        echo "# UFW 防火墙:"
        echo "sudo ufw allow $PORT/tcp"
        echo "sudo ufw reload"
    elif command -v firewall-cmd &> /dev/null; then
        echo "# firewalld:"
        echo "sudo firewall-cmd --permanent --add-port=$PORT/tcp"
        echo "sudo firewall-cmd --reload"
    else
        echo "# iptables (需要 root 权限):"
        echo "sudo iptables -A INPUT -p tcp --dport $PORT -j ACCEPT"
        echo "# 保存规则 (根据系统不同):"
        echo "# Ubuntu/Debian: sudo iptables-save > /etc/iptables/rules.v4"
        echo "# CentOS/RHEL: sudo service iptables save"
    fi
    exit 1
fi

# Configure firewall based on type
if command -v ufw &> /dev/null; then
    echo "检测到 UFW 防火墙"
    echo "配置规则..."
    ufw allow $PORT/tcp
    ufw reload
    echo "✓ UFW 规则已添加"
    echo ""
    echo "当前 UFW 状态:"
    ufw status | grep $PORT || echo "  (未找到 $PORT 规则，可能已存在)"
    
elif command -v firewall-cmd &> /dev/null; then
    echo "检测到 firewalld"
    echo "配置规则..."
    firewall-cmd --permanent --add-port=$PORT/tcp
    firewall-cmd --reload
    echo "✓ firewalld 规则已添加"
    echo ""
    echo "当前开放的端口:"
    firewall-cmd --list-ports | grep $PORT || echo "  (未找到 $PORT，可能已存在)"
    
else
    echo "检测到 iptables"
    echo "配置规则..."
    iptables -A INPUT -p tcp --dport $PORT -j ACCEPT
    echo "✓ iptables 规则已添加"
    echo ""
    echo "⚠ 注意: iptables 规则在重启后会丢失"
    echo "请根据您的系统保存规则:"
    echo "  - Ubuntu/Debian: iptables-save > /etc/iptables/rules.v4"
    echo "  - CentOS/RHEL: service iptables save"
    echo ""
    echo "当前 iptables 规则 (INPUT 链):"
    iptables -L INPUT -n | grep $PORT || echo "  (未找到 $PORT 规则)"
fi

echo ""
echo "=========================================="
echo "配置完成"
echo "=========================================="
echo ""
echo "测试连接:"
echo "  curl http://$(hostname -I | awk '{print $1}'):$PORT/health"
echo ""
echo "如果从其他机器访问，请使用服务器的 IP 地址:"
echo "  curl http://<服务器IP>:$PORT/health"

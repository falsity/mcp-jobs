#!/usr/bin/env python3
"""
Test MCP protocol implementation over HTTP.
Tests the complete MCP protocol flow: initialize -> initialized -> tools/list -> tools/call
"""
import json
import sys
import httpx
from typing import Optional

MCP_URL = "http://192.168.0.201:6000/mcp"


def test_mcp_protocol():
    """Test complete MCP protocol flow."""
    print("=" * 70)
    print("MCP 协议测试")
    print("=" * 70)
    print(f"服务器地址: {MCP_URL}\n")
    
    session_id: Optional[str] = None
    
    try:
        with httpx.Client(timeout=30.0) as client:
            # 1. Initialize
            print("【1】发送 initialize 请求...")
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "test-client",
                        "version": "1.0.0"
                    }
                }
            }
            
            response = client.post(
                MCP_URL,
                json=init_request,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                print(f"✗ initialize 失败: 状态码 {response.status_code}")
                print(f"  响应: {response.text}")
                return False
            
            # Extract session ID from header
            session_id = response.headers.get('Mcp-Session-Id')
            if not session_id:
                print("⚠ 警告: 未收到 Mcp-Session-Id header")
            else:
                print(f"✓ initialize 成功")
                print(f"  Session ID: {session_id}")
            
            init_data = response.json()
            print(f"  协议版本: {init_data.get('protocolVersion')}")
            print(f"  服务器: {init_data.get('serverInfo', {}).get('name')} v{init_data.get('serverInfo', {}).get('version')}")
            
            # 2. Notifications/initialized
            print("\n【2】发送 notifications/initialized...")
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }
            
            response = client.post(
                MCP_URL,
                json=initialized_notification,
                headers={
                    "Content-Type": "application/json",
                    "mcp-session-id": session_id or ""
                }
            )
            
            if response.status_code in [200, 202]:
                print("✓ notifications/initialized 成功")
            else:
                print(f"⚠ notifications/initialized 状态码: {response.status_code}")
            
            # 3. Tools/list
            print("\n【3】发送 tools/list 请求...")
            tools_list_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list"
            }
            
            response = client.post(
                MCP_URL,
                json=tools_list_request,
                headers={
                    "Content-Type": "application/json",
                    "mcp-session-id": session_id or ""
                }
            )
            
            if response.status_code != 200:
                print(f"✗ tools/list 失败: 状态码 {response.status_code}")
                print(f"  响应: {response.text}")
                return False
            
            tools_data = response.json()
            if 'error' in tools_data:
                print(f"✗ tools/list 返回错误: {tools_data['error']}")
                return False
            
            # MCP response can have tools in result.tools or directly in tools
            tools = tools_data.get('result', {}).get('tools', tools_data.get('tools', []))
            print(f"✓ tools/list 成功")
            print(f"  工具数量: {len(tools)}")
            
            if tools:
                print("\n工具列表:")
                for i, tool in enumerate(tools, 1):
                    name = tool.get('name', 'Unknown')
                    desc = tool.get('description', '')[:50]
                    print(f"  {i}. {name}: {desc}")
            else:
                print("  ⚠ 未返回任何工具")
                return False
            
            # 4. Test tools/call (if we have tools)
            if tools and len(tools) > 0:
                print("\n【4】测试 tools/call (mcp_search_job)...")
                tool_call_request = {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "mcp_search_job",
                        "arguments": {
                            "keyword": "Python",
                            "city": "北京"
                        }
                    }
                }
                
                response = client.post(
                    MCP_URL,
                    json=tool_call_request,
                    headers={
                        "Content-Type": "application/json",
                        "mcp-session-id": session_id or ""
                    }
                )
                
                if response.status_code != 200:
                    print(f"✗ tools/call 失败: 状态码 {response.status_code}")
                    print(f"  响应: {response.text}")
                    return False
                
                call_data = response.json()
                if 'error' in call_data:
                    print(f"✗ tools/call 返回错误: {call_data['error']}")
                    return False
                
                print("✓ tools/call 成功")
                result = call_data.get('result', {})
                content = result.get('content', [])
                if content:
                    print(f"  返回内容类型: {type(content)}")
                    if isinstance(content, list) and len(content) > 0:
                        first_item = content[0]
                        if isinstance(first_item, dict):
                            text = first_item.get('text', '')
                            if text:
                                try:
                                    data = json.loads(text)
                                    jobs = data.get('jobs', [])
                                    print(f"  找到职位数量: {len(jobs)}")
                                except:
                                    print(f"  内容长度: {len(text)} 字符")
            
            print("\n" + "=" * 70)
            print("✓ 所有测试通过！")
            print("=" * 70)
            return True
            
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_mcp_protocol()
    sys.exit(0 if success else 1)

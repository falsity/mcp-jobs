"""Check if MCP server is available and working."""
import asyncio
import sys
from pathlib import Path
import httpx
from datetime import datetime

# Add current directory to path for importing mcp_jobs
sys.path.insert(0, str(Path(__file__).parent))

MCP_URL = "http://192.168.0.201:6000/mcp"


async def check_server_http():
    """Check if server responds to HTTP requests."""
    print("=" * 60)
    print("1. HTTP 连接测试")
    print("=" * 60)
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            print(f"正在连接: {MCP_URL}")
            response = await client.get(MCP_URL)
            print(f"✓ HTTP 状态码: {response.status_code}")
            print(f"✓ 响应头: {dict(response.headers)}")
            
            # MCP 服务器可能返回 404 但服务器是运行的
            # 关键是能够连接到服务器
            if response.status_code in [200, 404, 405]:
                print("✓ 服务器可访问（MCP 使用特定协议，404 是正常的）")
                return True
            else:
                print(f"⚠ 服务器返回状态码: {response.status_code}")
                return False
    except httpx.TimeoutException:
        print("✗ 连接超时 - 服务器可能不可用")
        return False
    except httpx.ConnectError:
        print("✗ 连接失败 - 无法连接到服务器")
        print("  请检查:")
        print("  1. 服务器是否正在运行")
        print("  2. IP 地址是否正确")
        print("  3. 端口是否开放")
        return False
    except Exception as e:
        print(f"✗ 连接错误: {e}")
        return False


async def check_mcp_client():
    """Check MCP client connection."""
    print("\n" + "=" * 60)
    print("2. MCP 客户端连接测试")
    print("=" * 60)
    
    try:
        from mcp_jobs import get_mcp_jobs_client, get_mcp_tools
        
        print("正在创建 MCP 客户端...")
        client = get_mcp_jobs_client()
        print(f"✓ 客户端创建成功: {type(client).__name__}")
        
        print("\n正在获取工具列表...")
        start_time = datetime.now()
        
        tools = await asyncio.wait_for(get_mcp_tools(), timeout=10.0)
        
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"✓ 获取工具耗时: {elapsed:.2f} 秒")
        print(f"✓ 工具类型: {type(tools)}")
        print(f"✓ 工具数量: {len(tools)}")
        
        if tools:
            print("\n发现的工具:")
            for i, tool in enumerate(tools[:10], 1):  # 显示前10个
                tool_name = tool.name if hasattr(tool, 'name') else 'Unknown'
                tool_desc = ""
                if hasattr(tool, 'description') and tool.description:
                    tool_desc = tool.description[:60] + "..." if len(tool.description) > 60 else tool.description
                print(f"  {i}. {tool_name}")
                if tool_desc:
                    print(f"     {tool_desc}")
            
            if len(tools) > 10:
                print(f"  ... 还有 {len(tools) - 10} 个工具")
            
            return True
        else:
            print("⚠ 未发现工具（服务器可能未配置工具）")
            return True  # 连接成功但没有工具也是有效的
        
    except asyncio.TimeoutError:
        print("✗ 获取工具超时 - 服务器可能响应缓慢或不可用")
        return False
    except Exception as e:
        print(f"✗ MCP 客户端错误: {e}")
        import traceback
        traceback.print_exc()
        return False


async def check_tool_structure():
    """Check if tools can be used."""
    print("\n" + "=" * 60)
    print("3. 工具结构测试")
    print("=" * 60)
    
    try:
        # Same local module as check_mcp_client (no uni_agent package in this draft tree)
        from mcp_jobs import get_mcp_tools

        tools = await asyncio.wait_for(get_mcp_tools(), timeout=10.0)

        if not isinstance(tools, list):
            print(f"✗ 工具不是列表类型: {type(tools)}")
            return False

        print("✓ 工具是列表类型")

        # Verify list concatenation works (e.g. before merging with other LangChain tools)
        combined = tools + []
        print(f"✓ 工具列表拼接正常: {len(combined)} 个工具")
        
        # 检查工具属性
        if tools:
            first_tool = tools[0]
            print("\n第一个工具信息:")
            print(f"  类型: {type(first_tool)}")
            
            attrs = ['name', 'description', 'args_schema', 'invoke', 'ainvoke']
            for attr in attrs:
                if hasattr(first_tool, attr):
                    print(f"  ✓ 有 {attr} 属性")
                else:
                    print(f"  ⚠ 无 {attr} 属性")
        
        return True
        
    except Exception as e:
        print(f"✗ 工具结构测试失败: {e}")
        return False


async def main():
    """Main test function."""
    print("\n" + "=" * 60)
    print("MCP 服务器可用性检查")
    print("=" * 60)
    print(f"服务器地址: {MCP_URL}")
    print(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Test 1: HTTP connection (just to check if server is reachable)
    http_ok = await check_server_http()
    results.append(("服务器可达性", http_ok))
    
    # Test 2: MCP client (this is the real test)
    print("\n" + "=" * 60)
    print("注意: MCP 使用特定协议，HTTP 404 是正常的")
    print("=" * 60)
    
    mcp_ok = await check_mcp_client()
    results.append(("MCP 客户端连接", mcp_ok))
    
    # Test 3: Tool structure
    if mcp_ok:
        tool_ok = await check_tool_structure()
        results.append(("工具结构", tool_ok))
    
    # Summary
    print("\n" + "=" * 60)
    print("检查结果总结")
    print("=" * 60)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{status}: {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 MCP 服务器可用且正常工作！")
        return 0
    else:
        print("\n⚠ MCP 服务器存在问题，请检查:")
        print("  1. 服务器是否正在运行")
        print("  2. 网络连接是否正常")
        print("  3. 服务器配置是否正确")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

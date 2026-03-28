"""Detailed diagnosis of MCP server."""
import asyncio
import sys
import json
from pathlib import Path
import httpx

# Add current directory to path for importing mcp_jobs
sys.path.insert(0, str(Path(__file__).parent))

MCP_URL = "http://localhost:6000/mcp"


async def diagnose():
    """Run comprehensive diagnosis."""
    print("=" * 70)
    print("MCP 服务器诊断报告")
    print("=" * 70)
    print(f"服务器地址: {MCP_URL}\n")
    
    # 1. 基本连接测试
    print("【1】基本连接测试")
    print("-" * 70)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(MCP_URL)
            print("✓ 服务器可达")
            print(f"  状态码: {response.status_code}")
            
            # MCP 服务器通常只接受 POST 请求，GET 返回 404 是正常行为
            if response.status_code == 404:
                print("  ℹ GET 请求返回 404（正常：MCP 服务器只接受 POST 请求）")
            else:
                print(f"  响应内容: {response.text[:200]}")
            
            # 检查响应头
            if 'Mcp-Session-Id' in response.headers:
                print("  ✓ 检测到 MCP 响应头: Mcp-Session-Id")
    except Exception as e:
        print(f"✗ 连接失败: {e}")
        return
    
    # 2. 尝试 POST 请求
    print("\n【2】POST 请求测试")
    print("-" * 70)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # 尝试发送 JSON-RPC 请求
            jsonrpc_request = {
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
            
            response = await client.post(
                MCP_URL,
                json=jsonrpc_request,
                headers={"Content-Type": "application/json"}
            )
            print("✓ POST 请求成功")
            print(f"  状态码: {response.status_code}")
            print(f"  响应: {response.text[:300]}")
            
            try:
                data = response.json()
                print(f"  JSON 响应: {json.dumps(data, indent=2, ensure_ascii=False)[:200]}")
            except (ValueError, json.JSONDecodeError):
                print("  响应不是有效 JSON")
                
    except Exception as e:
        print(f"✗ POST 请求失败: {e}")
    
    # 3. MCP 客户端测试
    print("\n【3】MCP 客户端测试（使用 mcp_jobs.py 中的方式）")
    print("-" * 70)
    try:
        from mcp_jobs import get_mcp_jobs_client, get_mcp_tools
        
        print("创建客户端...")
        client = get_mcp_jobs_client()
        print(f"✓ 客户端类型: {type(client).__name__}")
        
        # Get the actual URL from client configuration
        client_config = client._servers.get("mcp_jobs", {}) if hasattr(client, '_servers') else {}
        actual_url = client_config.get('url', 'http://192.168.0.201:6000/mcp')
        print(f"  服务器 URL: {actual_url}")
        
        print("\n尝试获取工具（15秒超时）...")
        try:
            tools = await asyncio.wait_for(get_mcp_tools(), timeout=15.0)
            print("✓ 成功获取工具")
            print(f"  工具数量: {len(tools)}")
            
            if tools:
                print("\n工具列表:")
                for i, tool in enumerate(tools[:5], 1):
                    name = tool.name if hasattr(tool, 'name') else 'Unknown'
                    print(f"  {i}. {name}")
            else:
                print("  ⚠ 未发现工具（服务器可能未运行或返回空工具列表）")
                
        except asyncio.TimeoutError:
            print("✗ 获取工具超时")
            print("\n可能的原因:")
            print("  1. 服务器未正确实现 MCP 协议")
            print("  2. 服务器响应格式不正确")
            print("  3. 网络延迟过高")
            print("  4. 服务器需要特定的认证")
            print("  5. 服务器未运行（检查 http://192.168.0.201:6000/mcp）")
            
        except Exception as e:
            print(f"✗ 获取工具失败: {e}")
            import traceback
            print("\n详细错误信息:")
            traceback.print_exc()
            
    except Exception as e:
        print(f"✗ 客户端测试失败: {e}")
    
    # 4. 搜索工具调用测试
    print("\n【4】搜索工具调用测试")
    print("-" * 70)
    try:
        from mcp_jobs import get_mcp_jobs_client
        
        print("创建客户端...")
        client = get_mcp_jobs_client()
        
        print("\n尝试调用搜索工具...")
        print("  参数:")
        print("    keyword: Agent开发")
        print("    city: 北京")
        print("    workYear: 3年")
        print("    page: 1")
        
        async with client.session("mcp_jobs") as session:
            # Get tools first
            from langchain_mcp_adapters.tools import load_mcp_tools
            tools = await load_mcp_tools(session)
            
            # Find the search tool
            search_tool = None
            for tool in tools:
                if hasattr(tool, 'name') and tool.name == 'mcp_search_job':
                    search_tool = tool
                    break
            
            if search_tool:
                print(f"✓ 找到搜索工具: {search_tool.name}")
                
                # Call the tool with specified parameters
                try:
                    result = await asyncio.wait_for(
                        search_tool.ainvoke({
                            "keyword": "Agent开发",
                            "city": "北京",
                            "workYear": "3年",
                            "page": 1
                        }),
                        timeout=30.0
                    )
                    
                    print("✓ 搜索请求成功")
                    
                    # Parse and display results
                    result_text = None
                    
                    # Handle list response (MCP format)
                    if isinstance(result, list):
                        for item in result:
                            if isinstance(item, dict) and item.get("type") == "text":
                                result_text = item.get("text")
                                break
                        if not result_text and len(result) > 0:
                            result_text = str(result[0])
                    elif isinstance(result, str):
                        result_text = result
                    
                    if result_text:
                        try:
                            result_data = json.loads(result_text)
                            if isinstance(result_data, dict):
                                jobs = result_data.get("jobs", [])
                                metadata = result_data.get("metadata", {})
                                print(f"  找到职位数量: {len(jobs)}")
                                if metadata:
                                    total = metadata.get("totalResults", len(jobs))
                                    print(f"  总结果数: {total}")
                                    search_params = metadata.get("searchParams", {})
                                    if search_params:
                                        print(f"  搜索参数: {json.dumps(search_params, ensure_ascii=False)}")
                                
                                if jobs:
                                    print("\n  前3个职位:")
                                    for i, job in enumerate(jobs[:3], 1):
                                        title = job.get("title", "未知职位")
                                        company = job.get("company", "未知公司")
                                        salary = job.get("salary", "薪资未知")
                                        print(f"    {i}. {title} - {company} ({salary})")
                                else:
                                    print("  ⚠ 未找到职位")
                        except json.JSONDecodeError:
                            print(f"  响应内容（前200字符）: {result_text[:200]}...")
                    else:
                        print(f"  响应类型: {type(result)}")
                        print(f"  响应内容: {str(result)[:200]}...")
                        
                except asyncio.TimeoutError:
                    print("✗ 搜索请求超时（30秒）")
                except Exception as e:
                    print(f"✗ 搜索请求失败: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print("✗ 未找到搜索工具 mcp_search_job")
                print("  可用工具:")
                for tool in tools:
                    name = tool.name if hasattr(tool, 'name') else 'Unknown'
                    print(f"    - {name}")
                    
    except Exception as e:
        print(f"✗ 搜索工具测试失败: {e}")
        import traceback
        traceback.print_exc()
    
    # 5. 总结
    print("\n" + "=" * 70)
    print("诊断总结")
    print("=" * 70)
    
    # Check if tools were successfully retrieved
    try:
        from mcp_jobs import get_mcp_tools
        tools = await asyncio.wait_for(get_mcp_tools(), timeout=5.0)
        if tools and len(tools) > 0:
            print("""
✅ 测试通过！

结论:
1. 服务器可达（HTTP 连接正常）
2. MCP 协议连接正常
3. 成功获取工具列表

状态:
- 服务器响应格式正确
- MCP 客户端工作正常
- 工具可以正常加载

如果服务器不可用，代码会优雅地处理：
- 返回空工具列表
- 不会导致程序崩溃
- 可以继续使用其他工具
            """)
        else:
            print("""
⚠ 部分测试通过

结论:
1. 服务器是可达的（HTTP 连接正常）
2. 但未获取到工具（可能服务器未运行或配置问题）

建议:
- 检查服务器是否正确实现 MCP 协议
- 确认服务器端点路径是否正确
- 检查服务器日志查看错误信息
            """)
    except Exception:
        print("""
结论:
1. 服务器是可达的（HTTP 连接正常）
2. 但 MCP 协议连接可能存在问题

建议:
- 检查服务器是否正确实现了 MCP 协议
- 确认服务器端点路径是否正确
- 检查服务器日志查看错误信息
- 确认服务器是否需要认证或特殊配置

如果服务器不可用，代码会优雅地处理：
- 返回空工具列表
- 不会导致程序崩溃
- 可以继续使用其他工具
        """)


if __name__ == "__main__":
    asyncio.run(diagnose())

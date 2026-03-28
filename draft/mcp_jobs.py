import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

_client = None


def get_mcp_jobs_client() -> MultiServerMCPClient:
    """Get or create the MCP jobs client."""
    global _client
    if _client is None:
        _client = MultiServerMCPClient(
            {
                "mcp_jobs": {
                    "transport": "http",
                    "url": "http://192.168.0.201:6000/mcp",
                }
            }
        )
    return _client


async def get_mcp_tools():
    """Get tools from MCP client with proper initialization using session."""
    try:
        client = get_mcp_jobs_client()
        
        # Use session context to get tools (required for proper MCP protocol handling)
        async with client.session("mcp_jobs") as session:
            # Load tools using the session - this handles initialization automatically
            tools = await asyncio.wait_for(load_mcp_tools(session), timeout=10.0)
            
            # Ensure we return a list
            if isinstance(tools, list):
                return tools
            elif hasattr(tools, '__iter__') and not isinstance(tools, (str, bytes)):
                return list(tools)
            else:
                # If tools is not a list or iterable, return empty list
                return []
    except asyncio.TimeoutError:
        # Timeout - server may be unavailable
        import logging
        logging.warning("Timeout getting MCP tools - server may be unavailable")
        return []
    except Exception as e:
        # Log error and return empty list
        import logging
        logging.warning(f"Error getting MCP tools: {e}")
        return []

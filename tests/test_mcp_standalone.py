import asyncio
import os
import sys
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Run the client session to talk to the server
async def run_client():
    python_exe = sys.executable
    server_path = r"c:\Users\Kirta\OneDrive\Desktop\Kisan Sahayak\mcp_server\server.py"
    
    server_params = StdioServerParameters(
        command=python_exe,
        args=[server_path],
        env=os.environ.copy()
    )
    
    print(f"Connecting to MCP server at {server_path} using {python_exe}...")
    
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            
            # 1. Weather Test (should return upstream unavailable since keys are default)
            print("\n--- Test Weather Tool ---")
            try:
                weather_res = await session.call_tool("get_weather_forecast", {"location": "Bhopal"})
                content_text = weather_res.content[0].text
                print("Raw content returned:", content_text)
                envelope = json.loads(content_text)
                print("Parsed weather envelope status:", envelope.get("status"))
                print("Parsed weather envelope error:", envelope.get("error"))
            except Exception as e:
                print("Failed to call weather tool:", e)

            # 2. Mandi Price Test
            print("\n--- Test Mandi Price Tool ---")
            try:
                mandi_res = await session.call_tool("get_mandi_price", {"crop": "tomato", "location": "Gandhinagar"})
                content_text = mandi_res.content[0].text
                print("Raw content returned:", content_text)
                envelope = json.loads(content_text)
                print("Parsed mandi envelope status:", envelope.get("status"))
                print("Parsed mandi envelope error:", envelope.get("error"))
            except Exception as e:
                print("Failed to call mandi tool:", e)

            # 3. Validation Fail Test
            print("\n--- Test Validation Fail ---")
            try:
                validation_res = await session.call_tool("get_mandi_price", {"crop": "mango"})
                content_text = validation_res.content[0].text
                print("Raw content returned:", content_text)
                envelope = json.loads(content_text)
                print("Parsed envelope status:", envelope.get("status"))
                print("Parsed envelope error:", envelope.get("error"))
            except Exception as e:
                print("Failed to call mandi tool with invalid crop:", e)

if __name__ == "__main__":
    asyncio.run(run_client())

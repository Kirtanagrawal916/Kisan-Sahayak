"""
Weather Advisor specialist agent for advising on spray/irrigation timing.
Connects to the shared MCP server.
"""

import os
import sys
from mcp import StdioServerParameters
from google.adk.agents import Agent
from google.adk.tools import McpToolset

# Resolve the absolute path to server.py in the mcp_server/ package
_PYTHON_EXE = sys.executable
_SERVER_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../mcp_server/server.py")
)

# Connect to the shared MCP server's get_weather_forecast tool via ADK McpToolset
toolset = McpToolset(
    connection_params=StdioServerParameters(
        command=_PYTHON_EXE,
        args=[_SERVER_PATH]
    ),
    tool_filter=["get_weather_forecast"]
)

# System prompt copied verbatim from AGENT_SPECIFICATIONS.md §4.
SYSTEM_PROMPT = """You are the Weather Advisor for Kisan Sahayak. You tell farmers whether
it's safe to spray pesticide or irrigate right now, in simple Hindi.

Steps:
1. If location is missing, ask ONE clarifying question for it.
2. Call get_weather_forecast with the location.
3. Interpret the result:
   - Rain currently or expected soon -> advise against spraying now
     (it will wash off); irrigation can usually be skipped.
   - High wind -> advise against spraying (drift risk).
   - Clear, calm conditions -> safe to spray/irrigate now.
   - Hot and dry with no rain expected -> advise irrigating soon.
4. If the tool call fails or times out, say live weather isn't
   available right now, then give this fallback line, clearly labeled
   as a general rule of thumb, not live data:
   "Aam taur par subah jaldi ya shaam ko spray/sinchai karna sabse
   surakshit rehta hai — is mausam ke hisaab se sthaniya salaah bhi
   lein."

Always give ONE clear recommendation with a one-line reason. Reply only
in simple Hindi. Never discuss disease or price; redirect politely if
asked."""

root_agent = Agent(
    name="weather_agent",
    model="gemini-2.5-flash",
    instruction=SYSTEM_PROMPT,
    tools=[toolset]
)

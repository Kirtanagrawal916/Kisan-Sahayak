"""
Mandi Price specialist agent for reporting crop prices from Agmarknet.
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

# Connect to the shared MCP server's get_mandi_price tool via ADK McpToolset
toolset = McpToolset(
    connection_params=StdioServerParameters(
        command=_PYTHON_EXE,
        args=[_SERVER_PATH]
    ),
    tool_filter=["get_mandi_price"]
)

# System prompt copied verbatim from AGENT_SPECIFICATIONS.md §3.
SYSTEM_PROMPT = """You are the Mandi Price Agent for Kisan Sahayak. You report current
tomato/wheat market prices to farmers in simple Hindi.

Steps:
1. If the crop isn't stated, ask ONE combined question for crop and
   market/district together (not two separate questions).
2. Call get_mandi_price with the crop (and location, if given).
3. If the call succeeds, report the price clearly labeled as today's
   live price, and briefly note if a nearby market is paying more.
4. If the call fails or times out, say live data isn't available right
   now, then give this fallback line, clearly labeled as a general
   estimate, not live data:
   "Aam taur par [crop] ka bhaav is mausam mein [static range] ke
   aas-paas rehta hai — kripya sthaniya mandi se confirm karein."

Reply only in simple Hindi. Never invent a specific live-sounding number
when the tool has failed. Never discuss disease or weather — redirect
politely if asked."""

from orchestrator_agent.security import before_model_check, after_model_check

root_agent = Agent(
    name="mandi_price_agent",
    model="gemini-2.5-flash",
    description="Specialist for reporting crop market prices (mandi prices) to farmers.",
    instruction=SYSTEM_PROMPT,
    tools=[toolset],
    before_model_callback=before_model_check,
    after_model_callback=after_model_check
)


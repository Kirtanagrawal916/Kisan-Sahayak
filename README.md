# Kisan Sahayak (Farmer's AI Assistant)

Kisan Sahayak is an agentic AI assistant designed to help Indian farmers with crop disease diagnosis, mandi price queries, and weather-driven spray/irrigation advice.

For detailed design decisions, system prompts, and architectural flows, please refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Setup

1. **Prerequisites**:
   - Python 3.10+
   - Git

2. **Clone the repository**:
   ```bash
   git clone https://github.com/Kirtanagrawal916/Kisan-Sahayak.git
   cd Kisan-Sahayak
   ```

3. **Install dependencies**:
   Create a virtual environment and install requirements:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Environment Variables

Create a `.env` file in the root directory based on the following template (do not check real credentials into source control):

```ini
# Gemini API Key (required for agents)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenWeatherMap API Key (required for live weather forecasts)
OPENWEATHER_API_KEY=your_openweathermap_api_key_here

# Agmarknet API Key (required for live mandi prices)
MANDI_API_KEY=your_agmarknet_api_key_here
```

*Note: If API keys contain their default placeholders (e.g. starting with `your_`), the MCP server will run in offline simulation fallback mode.*

## Running Locally

Kisan Sahayak is powered by the Google Agent Development Kit (ADK). You can run the orchestrator entry point:

1. **Interact via CLI**:
   ```powershell
   $env:PYTHONUTF8=1
   .\.venv\Scripts\adk run orchestrator_agent
   ```

2. **Interact via Web UI**:
   ```powershell
   .\.venv\Scripts\adk web orchestrator_agent
   ```
   Open your browser at the local server address displayed in the console.

*Note: The Weather Advisor and Mandi Price specialists dynamically launch the shared MCP server subprocess (`mcp_server/server.py`) at runtime over the stdio protocol. There is no need to run the server separately.*

## Demo Script

To run a guided run-through demonstrating crop disease visual diagnosis, price retrieval, weather timing advice, and fallback behaviors, please refer to the walkthrough instructions in [demo_script.md](demo_script.md).

Note: The demo is hosted on Render's free tier. The first request after inactivity may take up to ~50 seconds due to cold start.

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

## Deployment

Kisan Sahayak is built as a standard ASGI FastAPI application and can be easily deployed to any ASGI-compatible platform.

### Environment Variables

Ensure the following environment variables are set in your production environment:
- `GEMINI_API_KEY`: Your Gemini API Key.
- `OPENWEATHER_API_KEY`: Your OpenWeatherMap API Key.
- `MANDI_API_KEY`: Your Agmarknet API Key.
- `PORT`: (Optional) The port on which the server should run (automatically managed by most hosting providers).

---

### Deploying to Render

1. Create a new **Web Service** on Render.
2. Connect your Git repository.
3. Configure the following settings:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add the required keys (`GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, `MANDI_API_KEY`) under **Environment Variables**.
5. Click **Deploy Web Service**.

---

### Deploying to Railway

1. Create a new project on Railway.
2. Select **Deploy from GitHub repo** and connect your repository.
3. Railway will automatically detect Python. Configure the start command in your variables or Railway service settings:
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add your API keys (`GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, `MANDI_API_KEY`) under **Variables**.
5. Click **Deploy**.

---

### Deploying to Google Cloud Run

To deploy directly to Google Cloud Run using the `gcloud` CLI:

1. Install the Google Cloud SDK and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Deploy from source:
   ```bash
   gcloud run deploy kisan-sahayak \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="GEMINI_API_KEY=your_gemini_key,OPENWEATHER_API_KEY=your_weather_key,MANDI_API_KEY=your_mandi_key"
   ```

3. Note the generated Service URL returned by Cloud Run.


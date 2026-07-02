# SPEC.md — Kisan Sahayak (Farmer's AI Assistant)

## Problem
Smallholder farmers in India lack a single, simple point of access to
time-sensitive information they need every season: what disease is
affecting their crop, what it is currently selling for in nearby markets,
and whether weather conditions are safe for spraying or irrigation. This
information exists across multiple government portals and expert sources,
but is fragmented, technical, and often not available in the farmer's own
language.

## Users
- Smallholder farmers growing **tomato** and **wheat** (MVP scope)
- Primary interaction via photo upload + simple text query
- Assumed comfortable in Hindi, not necessarily in English or technical
  agricultural terminology

## Features
- **Crop Doctor Agent** — diagnoses disease/pest from a leaf photo; returns
  severity (mild/moderate/severe), treatment, and prevention tips
- **Mandi Price Agent** — fetches live market prices via an MCP server so
  farmers know where to sell for the best price
- **Weather Advisor Agent** — advises on safe timing for spraying/irrigation
  based on current weather conditions
- **Orchestrator Agent** — routes each farmer query to the correct
  specialist agent
- **Hindi-first responses** — all farmer-facing output is in simple Hindi,
  regardless of which agent produced it
- **Security-by-design** — each agent only receives the data it needs
  (least-privilege access); no agent stores farmer PII unless required for
  its specific task

## Tech Stack
- **Google Agent Development Kit (ADK)**, Python — agent definitions and
  orchestration
- **Gemini 2.5 Flash** — multimodal reasoning (vision for crop photos, text
  for advisory responses)
- **MCP server(s)** — wrapping external data sources as agent tools
- **Python** — glue code, tool functions, local knowledge base

## APIs
- **Gemini API** (Google AI Studio, free tier) — vision + text generation
  for all agents
- **Agmarknet / data.gov.in mandi price API** — accessed via a custom MCP
  server for the Mandi Price Agent
- **OpenWeatherMap API** — current conditions and forecast for the Weather
  Advisor Agent

## Database
- **No persistent database in the MVP** — each diagnosis/query is handled
  statelessly per request, which keeps the demo simple and reduces PII risk
- **Local JSON knowledge base** (`tools.py`) — verified disease → treatment
  mapping used to ground the Crop Doctor Agent's advice
- **Future work (not built for this capstone):** a lightweight store
  (SQLite or vector DB) for per-farmer history and an audit log of which
  agent accessed which piece of data, to extend the security story

## Constraints
- Solo developer, ~5-day build window (submission due July 6, 2026)
- Gemini API **free tier** rate limits (requests per minute/day) — scope
  and testing volume are designed to stay comfortably within these
- Demo scope limited to **two crops (tomato, wheat)** and a **handful of
  known diseases** to keep accuracy and reliability high within the time
  available
- Hackathon-scale demo, not production infrastructure — no real payment
  processing, user accounts, or scaled deployment

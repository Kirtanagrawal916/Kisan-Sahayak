# API_CONTRACTS.md — Kisan Sahayak

Implementation-ready contracts for every tool, MCP endpoint, and external
API used by the four agents defined in `AGENT_SPECIFICATIONS.md`. This
document only refines contracts — it does not modify the approved
architecture, blueprint, or agent behavior.

---

## 0. Standard Conventions (apply to every contract below)

### 0.1 Standard Response Envelope

Every tool/API response in this system uses this shape:

```json
{
  "status": "success | error | clarification_needed",
  "data": {},
  "confidence": "high | medium | low | null",
  "source": "live | fallback | local_kb | null",
  "error": {
    "code": "string",
    "message": "string",
    "retryable": true
  },
  "clarification": {
    "question": "string",
    "options": ["string"],
    "max_reprompts": 1
  },
  "meta": {
    "multi_intent": { "detected": false, "secondary_intent": null }
  }
}
```

Rule: exactly one of `data`, `error`, `clarification` is non-null,
matching `status`. Unused fields are explicitly `null`, not omitted —
this keeps the schema identical across all six contracts.

### 0.2 Standard Error Codes

| Code | Meaning | Retryable |
|---|---|---|
| `E_INVALID_INPUT` | Missing/malformed required field | No |
| `E_UNSUPPORTED_CROP` | Crop outside tomato/wheat scope | No |
| `E_TIMEOUT` | Call exceeded its timeout window | Yes (see §0.7) |
| `E_UPSTREAM_UNAVAILABLE` | External API/MCP server unreachable or errored | Yes (see §0.7) |
| `E_RATE_LIMITED` | Gemini API 429 (free-tier limit) | **No** — never retry, see §5 |
| `E_UNKNOWN` | Unclassified failure | No |

*(Knowledge-base "not found" is intentionally **not** an error — see §1,
it is a normal `success` response with `data.found: false`.)*

### 0.3 Confidence Level Definitions

| Level | Meaning | Required behavior |
|---|---|---|
| `high` | Strong signal (live data, or a clear visual match) | No disclaimer needed |
| `medium` | Reasonable inference, or a fallback value used | Disclaimer/label required |
| `low` | Weak/uncertain signal | Disclaimer + recommend expert |

For the Weather and Mandi Price tools, confidence is mechanically tied
to `source`: `source: "live"` → `confidence: "high"`; `source:
"fallback"` → `confidence: "medium"`. This keeps confidence handling
consistent without needing a separate judgment call in those two tools.

### 0.4 Clarification Response Schema

```json
{
  "status": "clarification_needed",
  "data": null,
  "error": null,
  "confidence": null,
  "source": null,
  "clarification": {
    "question": "Kis fasal ka aur kaunsi mandi ka bhaav chahiye?",
    "options": ["tomato", "wheat"],
    "max_reprompts": 1
  },
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

`max_reprompts: 1` encodes the one-clarification-cap rule (from
`AGENT_SPECIFICATIONS.md`) directly into the contract, so it's
enforceable, not just a prompt instruction.

### 0.5 Knowledge Base JSON Schema

Formalizes the shape of every entry in `crop_doctor_agent/tools.py`'s
`DISEASE_DB`:

```json
{
  "crop": "tomato",
  "disease_key": "early_blight",
  "hindi_name": "अगेती झुलसा (Early Blight)",
  "symptoms": "string",
  "treatment": "string",
  "prevention": ["string", "string"]
}
```

Valid `disease_key` values (per `AGENT_SPECIFICATIONS.md`):
`early_blight`, `late_blight`, `leaf_curl_virus` (tomato);
`yellow_rust`, `brown_rust`, `powdery_mildew` (wheat).

### 0.6 Multi-Intent Response Format (Reserved, Future-Ready)

`meta.multi_intent` is present in every response but is always
`{"detected": false, "secondary_intent": null}` in this MVP. Current
multi-intent handling happens at the Orchestrator prompt level (primary
intent + one invite line, per `AGENT_SPECIFICATIONS.md`) — this field
changes no current behavior. It exists only so a future version could
report a detected secondary intent through the same schema without a
breaking change.

### 0.7 Retry & Timeout Quick Reference

| Contract | Retry Policy | Timeout |
|---|---|---|
| `lookup_disease_info()` | None (local, deterministic) | None (instant) |
| Crop Diagnosis Tool (composite) | 1 retry, transient failures only — never on rate limit | 15s |
| Gemini Vision interaction | 1 retry, transient failures only — never on rate limit | 15s |
| Weather Tool | 1 retry after 2s delay | 5s/attempt, 10s total |
| Mandi Price Tool | 1 retry after 2s delay | 5s/attempt, 10s total |
| MCP Server (transport) | 1 reconnect attempt | 5s connection |

---

## 1. `lookup_disease_info()`

**Purpose:** Local grounding function tool for the Crop Doctor Agent.
Returns verified treatment/prevention data so the agent never states
dosage-relevant facts from memory alone.

**Input schema:**
```json
{
  "crop": "tomato | wheat",
  "disease_key": "early_blight | late_blight | leaf_curl_virus | yellow_rust | brown_rust | powdery_mildew"
}
```

**Output schema — success, found:**
```json
{
  "status": "success",
  "data": {
    "found": true,
    "crop": "tomato",
    "disease_key": "early_blight",
    "hindi_name": "अगेती झुलसा (Early Blight)",
    "symptoms": "Purani patiyon par gol-gol bhoore dhabbe...",
    "treatment": "Copper-based ya Mancozeb group ki fungicide use karein...",
    "prevention": ["Paudhon ke beech sahi doori rakhein", "Crop rotation apnayein"]
  },
  "confidence": null, "source": "local_kb", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock success — not found:**
```json
{
  "status": "success",
  "data": {
    "found": false,
    "note": "This exact disease isn't in the verified database. Give general, cautious advice and recommend local expert confirmation."
  },
  "confidence": null, "source": "local_kb", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock failure:**
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "E_UNSUPPORTED_CROP", "message": "'mango' is not in the verified database (only tomato/wheat supported).", "retryable": false },
  "confidence": null, "source": "local_kb", "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Validation rules:**
- `crop` normalized via `.strip().lower()`; must equal `"tomato"` or
  `"wheat"`, else `E_UNSUPPORTED_CROP`.
- `crop`/`disease_key` must be non-empty strings; non-string or empty
  input → `E_INVALID_INPUT`.
- An unrecognized `disease_key` (typo, synonym) is **not** an error —
  it returns `success` with `data.found: false`, since the model may
  reasonably propose a near-miss key.

**Edge cases:**
- Mixed case / extra whitespace input (`"Tomato "`, `"WHEAT"`) → normalized before comparison.
- `disease_key` valid for a *different* crop than given (e.g. `yellow_rust` with `crop: "tomato"`) → `found: false`, not an error.
- `null` or numeric type passed for either field → `E_INVALID_INPUT`.

**Retry policy:** None — synchronous, local, no network dependency.

**Timeout policy:** None required; treated as instantaneous (<10ms).

---

## 2. Crop Diagnosis Tool (composite)

**Purpose:** The end-to-end diagnosis capability the Orchestrator
delegates to — combines the Gemini Vision interaction (§5) with
`lookup_disease_info()` (§1) into one farmer-facing result. Documented
as a callable contract for implementation/testing even though it is
realized via ADK sub-agent transfer, not a literal function call.

**Input schema:**
```json
{
  "image": { "mime_type": "image/jpeg | image/png", "data_base64": "string", "max_size_mb": 5 },
  "text": "string | null"
}
```

**Mock success:**
```json
{
  "status": "success",
  "data": {
    "crop": "tomato",
    "disease_key": "early_blight",
    "hindi_name": "अगेती झुलसा (Early Blight)",
    "severity": "Madhyam",
    "treatment": "Copper-based ya Mancozeb group ki fungicide use karein...",
    "prevention": ["Paudhon ke beech sahi doori rakhein"],
    "disclaimer": null
  },
  "confidence": "high", "source": "local_kb", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock clarification needed (first blurry photo):**
```json
{
  "status": "clarification_needed",
  "data": null, "error": null, "confidence": null, "source": null,
  "clarification": {
    "question": "Photo thodi dhundhli hai, kripya dobara ek saaf photo bhejein.",
    "options": null,
    "max_reprompts": 1
  },
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock failure (unsupported crop):**
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "E_UNSUPPORTED_CROP", "message": "Photo does not appear to be tomato or wheat.", "retryable": false },
  "confidence": null, "source": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Validation rules:**
- `image` required; `mime_type` must be `image/jpeg` or `image/png`;
  `max_size_mb <= 5`, else `E_INVALID_INPUT`.
- `text` optional, capped at 500 chars (extra is ignored, not rejected).
- `severity` must be one of `Halka | Madhyam | Gambhir`.
- `disclaimer` must be non-null whenever `confidence != "high"`.

**Edge cases:**
- Second blurry photo after the one allowed clarification → must NOT
  ask again; returns `success` with `confidence: "low"` and a populated
  `disclaimer` instead of a second `clarification_needed`.
- Disease visually ambiguous between two DB entries → best guess used,
  `confidence: "medium"`.
- Underlying Gemini Vision call fails/rate-limited → this contract
  surfaces `E_UPSTREAM_UNAVAILABLE` or `E_RATE_LIMITED` accordingly (see §5).

**Retry policy:** One retry of the underlying Gemini Vision call on
transient failure only — never on `E_RATE_LIMITED`.
`lookup_disease_info()` is never retried (no network).

**Timeout policy:** 15 seconds total. On timeout, returns `status:
"error"`, `code: "E_TIMEOUT"`, with a Hindi apology asking the farmer to
resend.

---

## 3. Weather Tool (`get_weather_forecast`)

**Purpose:** Fetches current conditions from OpenWeatherMap via the
shared MCP server, for the Weather Advisor Agent.

**Input schema:**
```json
{ "location": "string" }
```

**Mock success — live:**
```json
{
  "status": "success",
  "data": { "condition": "clear", "temperature_c": 32, "rain_expected_next_6h": false, "wind_speed_kmh": 8 },
  "confidence": "high", "source": "live", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock success — fallback:**
```json
{
  "status": "success",
  "data": { "fallback_advice": "Aam taur par subah jaldi ya shaam ko spray/sinchai karna sabse surakshit rehta hai." },
  "confidence": "medium", "source": "fallback", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock failure (transport-level, before agent applies fallback):**
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "E_UPSTREAM_UNAVAILABLE", "message": "OpenWeatherMap did not respond within the timeout window.", "retryable": true },
  "confidence": null, "source": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```
*Per architecture, the Weather Agent itself converts this into the
"success + fallback" response above rather than showing a raw error to
the farmer — both forms are documented here for implementation clarity.*

**Validation rules:**
- `location` must be a non-empty string, 2-100 chars.
- This tool is never called with an empty location — the Weather Agent
  asks its one clarifying question first (see `AGENT_SPECIFICATIONS.md`).

**Edge cases:**
- Misspelled/unrecognized location → API responds but can't resolve it → mapped to `E_INVALID_INPUT`, not `E_UPSTREAM_UNAVAILABLE` (the service did respond).
- Ambiguous city name (multiple matches) → tool picks the first/best match; no extra clarification round-trip.
- Response arrives right at the timeout boundary → treated as `E_TIMEOUT`.

**Retry policy:** 1 retry after a 2-second delay on `E_TIMEOUT` /
`E_UPSTREAM_UNAVAILABLE`; if the retry also fails, the agent uses the
static fallback — no further retries.

**Timeout policy:** 5 seconds per attempt (10 seconds total including
the one retry).

---

## 4. Mandi Price Tool (`get_mandi_price`)

**Purpose:** Fetches live prices from Agmarknet/data.gov.in via the
shared MCP server, for the Mandi Price Agent.

**Input schema:**
```json
{ "crop": "tomato | wheat", "location": "string | null" }
```

**Mock success — live:**
```json
{
  "status": "success",
  "data": { "crop": "tomato", "market": "Gandhinagar", "price_per_quintal_inr": 1800, "date": "2026-07-02" },
  "confidence": "high", "source": "live", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock success — fallback:**
```json
{
  "status": "success",
  "data": { "fallback_advice": "Aam taur par tamatar ka bhaav is mausam mein ₹1200–2000/quintal ke aas-paas rehta hai." },
  "confidence": "medium", "source": "fallback", "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock failure:**
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "E_UPSTREAM_UNAVAILABLE", "message": "Agmarknet API did not respond within the timeout window.", "retryable": true },
  "confidence": null, "source": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Validation rules:**
- `crop` must be `"tomato"` or `"wheat"`, else `E_UNSUPPORTED_CROP`.
- `location` optional; if omitted, the tool uses a default market.

**Edge cases:**
- Crop known but no recent price for that market → `success` with
  `price_per_quintal_inr: null` and a note; agent treats it like fallback.
- District query matches multiple markets → nearest/largest market used by default.
- Price data older than 48h → still returned, `date` field lets the agent flag it as possibly stale.

**Retry policy:** 1 retry after a 2-second delay, same pattern as the
Weather Tool for consistency.

**Timeout policy:** 5 seconds per attempt (10 seconds total).

---

## 5. Gemini Vision interaction

**Purpose:** The underlying model call the Crop Doctor Agent makes to
Gemini for visual disease reasoning. Documented separately from the
composite Crop Diagnosis Tool (§2) to isolate "model failure" from
"knowledge-base failure" during debugging.

**Input schema (sent to Gemini):**
```json
{
  "model": "gemini-2.5-flash",
  "contents": [
    { "role": "user", "parts": [
      { "inline_data": { "mime_type": "image/jpeg", "data": "<base64>" } },
      { "text": "<farmer's accompanying text, if any>" }
    ]}
  ],
  "system_instruction": "<Crop Doctor system prompt, see AGENT_SPECIFICATIONS.md>"
}
```

**Mock success (parsed):**
```json
{
  "status": "success",
  "data": { "crop_identified": "tomato", "disease_key_guess": "early_blight", "severity_guess": "Madhyam", "raw_model_confidence": "medium" },
  "confidence": "medium", "source": null, "error": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock failure — rate limited:**
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "E_RATE_LIMITED", "message": "Gemini API returned 429 — free-tier rate limit reached.", "retryable": false },
  "confidence": null, "source": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Mock failure — timeout:**
```json
{
  "status": "error",
  "data": null,
  "error": { "code": "E_TIMEOUT", "message": "Gemini API did not respond within 15 seconds.", "retryable": true },
  "confidence": null, "source": null, "clarification": null,
  "meta": { "multi_intent": { "detected": false, "secondary_intent": null } }
}
```

**Validation rules:**
- Image must decode to a valid image; corrupt base64 is rejected as
  `E_INVALID_INPUT` **before** sending to Gemini, to avoid burning a
  quota-consuming call on invalid input.
- `disease_key_guess` enum-checking against §0.5's valid list happens
  at the Crop Diagnosis Tool layer (§2), not inside this raw model call.

**Edge cases:**
- Model returns free text that doesn't parse into expected fields → `E_UNKNOWN`; §2 falls back to a generic low-confidence response rather than crashing.
- Model returns an empty/refused response → `E_UNKNOWN`.
- Rate limit hit mid-demo → surfaced immediately (no retry), so the agent can apologize rather than hang.

**Retry policy:** 1 retry on `E_TIMEOUT` or a transient 5xx only.
**Never retry `E_RATE_LIMITED`** — retrying a 429 wastes scarce
free-tier quota and rarely succeeds within a live demo's timeframe.

**Timeout policy:** 15 seconds (vision calls are slower than text-only).

---

## 6. MCP Server interfaces

**Purpose:** The transport-level contract for the single shared MCP
server process that both the Weather Tool (§3) and Mandi Price Tool
(§4) run on — how an agent calls a tool over MCP, independent of each
tool's own schema.

**Input schema (generic `tools/call`, per MCP protocol):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_mandi_price | get_weather_forecast",
    "arguments": {}
  },
  "id": "string"
}
```

**Mock success (wraps a §3/§4 response inside the MCP result envelope):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "content": [
      { "type": "text", "text": "{\"status\":\"success\",\"data\":{...},\"confidence\":\"high\",\"source\":\"live\"}" }
    ]
  }
}
```

**Mock failure (MCP-level, connection/protocol failure — distinct from
a tool returning its own `status: error`):**
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32000,
    "message": "MCP server unreachable",
    "data": { "app_code": "E_UPSTREAM_UNAVAILABLE" }
  }
}
```

**Validation rules:**
- `name` must be exactly `get_mandi_price` or `get_weather_forecast` —
  no other tools are registered on this server.
- `arguments` must match the named tool's input schema (§3/§4);
  malformed arguments are rejected by the server before any external
  API call is attempted (fail fast, saves an unnecessary network hop).

**Edge cases:**
- Server process not running when an agent starts → the agent's first
  tool call fails immediately with `E_UPSTREAM_UNAVAILABLE` — no silent hang.
- Concurrent calls from both specialist agents → handled independently;
  no shared state between calls (server is stateless, per `SPEC.md`).
- Server crashes mid-call → caught by the calling tool's own timeout
  (§3/§4), not duplicated here.

**Retry policy:** 1 reconnect attempt if the initial connection drops;
if that also fails, `E_UPSTREAM_UNAVAILABLE` is surfaced to the calling
agent, which then applies its own tool-level fallback (§3/§4).

**Timeout policy:** 5-second connection timeout. Per-call timeout is
owned by the individual tool contract (§3/§4), not duplicated here.
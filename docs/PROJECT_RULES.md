# PROJECT_RULES.md — Kisan Sahayak (Farmer's AI Assistant)

*Implementation rulebook. Not a design document — carries no new
architecture, agents, prompts, or schemas. If a rule here ever seems to
conflict with an approved document, the approved document wins; fix
this file, not the other way around.*

---

## 1. Purpose

- Give a single, short reference both humans and AI coding assistants
  check **before writing any code**.
- Prevent scope creep, architecture drift, and re-litigating decisions
  that are already closed.
- Make every implementation decision traceable to an approved doc.

---

## 2. Source of Truth (priority order)

1. `API_CONTRACTS.md` — exact schemas, error codes, retry/timeout values
2. `AGENT_SPECIFICATIONS.md` — exact system prompts, decision rules
3. `FILE_BLUEPRINT.md` — file ownership, allowed imports/callers
4. `ARCHITECTURE.md` — system shape, routing rules, error table
5. `SPEC.md` — product intent, scope, constraints
6. `IMPLEMENTATION_ROADMAP.md` — task order and file-scope per task
7. `PROJECT_RULES.md` (this file) — cross-cutting enforcement only

- Higher number never overrides lower number.
- This file **never introduces new facts** — it only enforces what 1–6
  already say.

---

## 3. Architecture Rules

- Exactly **1 Orchestrator + 3 specialists + 1 shared MCP server**.
  Never more, never fewer.
- Orchestrator: routing only. Never calls a tool. Never answers a
  domain question. Never transfers to more than one specialist per turn.
- Specialists never call each other, never call another specialist's
  tool, never import the Orchestrator (would create a cycle).
- Crop Doctor's tool is local only (no network). Mandi Price and
  Weather reach external data **only** through the shared MCP server.
- No agent, tool, or file may be added outside the set defined in
  `ARCHITECTURE.md` §1–§5 and `FILE_BLUEPRINT.md`.

---

## 4. Agent Rules

- Every system prompt is copied **verbatim** from
  `AGENT_SPECIFICATIONS.md`. No paraphrasing, trimming, or "improving."
- Every agent's clarifying questions are capped at **one per turn**,
  per `AGENT_SPECIFICATIONS.md`.
- Crop Doctor's valid `disease_key` list is **derived from
  `tools.DISEASE_DB.keys()` at import time** — never hardcoded a
  second time, anywhere.
- Crop Doctor must call `lookup_disease_info` before stating any
  treatment/prevention fact. Never states exact dosage from memory.
- Mandi Price / Weather must never present a fabricated number as live
  data when their MCP tool fails — fallback line only, clearly labeled.
- All farmer-facing output is simple Hindi, in every agent, no
  exceptions.

---

## 5. API & Contract Rules

- Every tool input/output matches its `API_CONTRACTS.md` schema
  **exactly** — field names, nesting, and the `status`/`data`/`error`/
  `clarification` envelope shape are not negotiable.
- Retry/timeout values are fixed by `API_CONTRACTS.md` §0.7. Do not
  add retries, do not change timeout numbers, do not retry
  `E_RATE_LIMITED` under any circumstance.
- `lookup_disease_info` returning `found: false` is a normal
  `success` response, not an error — never convert it into one.
- Do not add new error codes beyond `API_CONTRACTS.md` §0.2 without
  updating that document first (out of scope for implementation work).

---

## 6. File Ownership Rules

- One file = one owner = one responsibility, per `FILE_BLUEPRINT.md`.
- Before editing any file, re-read its `FILE_BLUEPRINT.md` entry:
  Responsibilities, Allowed callers, **Must NOT depend on**, **Never
  implement here**.
- `mcp_server/server.py` is reachable only via MCP protocol — never
  import it directly from any `agent.py`.
- `crop_doctor_agent/tools.py` stays dependency-free (stdlib only).
- `shared_constants.py` holds `CROPS` only — never add `DISEASE_KEYS`
  or any function to it.
- If a task requires touching a file outside its declared scope, stop
  and re-check `FILE_BLUEPRINT.md` — do not silently expand scope.

---

## 7. Coding Standards

- Python only, matching `SPEC.md`'s tech stack.
- Plain functions for local tools (ADK auto-wraps as `FunctionTool`) —
  no unnecessary classes or abstraction layers.
- No global mutable state outside each agent's own module.
- No new third-party dependencies beyond what `requirements.txt`
  already lists without updating it deliberately (not silently).
- Docstrings on every tool function; no docstrings needed on
  boilerplate `__init__.py` re-exports.
- No commented-out code, no TODO-and-forget — either implement per the
  approved spec or leave it out.

---

## 8. Error Handling Rules

- Implement every row of `ARCHITECTURE.md` §9 exactly as written —
  no additional error paths, no fewer.
- All error handling is inline (try/except + labeled fallback text).
  No retry queues, no circuit breakers, no dead-letter handling.
- Static fallback lines are hardcoded string constants, not a cache,
  not a file, not a DB lookup.
- Never surface raw exceptions, stack traces, or technical error text
  to the farmer — always a plain Hindi message.

---

## 9. Testing Rules

- No formal test framework is required for this hackathon MVP.
- Each specialist must be manually verified **standalone** via
  `adk web`/`adk run` before the Orchestrator wires it in (see
  `IMPLEMENTATION_ROADMAP.md` Phase 1/3/4).
- Every `ARCHITECTURE.md` §9 error-handling row must be manually
  reproduced at least once before submission (Roadmap T6.1).
- `demo_script.md` must be run end-to-end, unmodified, at least once
  before presenting (Roadmap T7.1).
- Throwaway test scripts used to verify a tool are never committed —
  only the source file itself lands in the repo.

---

## 10. Git & Commit Rules

- One commit per `IMPLEMENTATION_ROADMAP.md` task ID (e.g. `T1.1:
  add disease knowledge base + lookup_disease_info`).
- Commit message references the task ID and the file(s) touched —
  no bundled multi-task commits.
- Never commit `.env` (only `.env.example`).
- Never commit sample-image binaries larger than needed for the demo
  script — keep `sample_images/` small and purposeful.
- No force-pushes over shared history; no rewriting merged commits.

---

## 11. Performance & Token Efficiency Rules

- When prompting an AI assistant to implement a task, paste **only**
  the cited `§section` from the relevant doc — never paste an entire
  document into a task prompt.
- One task = one AI dispatch. Do not merge multiple
  `IMPLEMENTATION_ROADMAP.md` task IDs into a single prompt.
- Keep each agent's own instruction text as short as its
  `AGENT_SPECIFICATIONS.md` entry — do not pad prompts with
  restated context the model doesn't need per call.
- MCP tool calls: exactly one call per specialist per farmer turn —
  no speculative or duplicate calls.
- No agent should re-fetch data it already has in the current turn.

---

## 12. Security Rules

- No PII (phone number, GPS, name, farmer ID) is collected, logged,
  or stored anywhere in the pipeline — per `SPEC.md`'s security-by-design
  principle.
- Each agent gets only the tool(s) it owns — no shared credentials,
  no agent reads another agent's tool or data source.
- API keys live only in `.env` (git-ignored); `.env.example` never
  contains real values.
- MCP server validates arguments before making any external call
  (fail fast, per `API_CONTRACTS.md` §6) — never trust unvalidated
  input into an external HTTP call.
- No logging of raw farmer images or messages to persistent storage.

---

## 13. Scope Control — Never Add

- Database, vector DB, or any persistent store
- Memory, session state, or per-farmer history across turns
- Authentication, user accounts, or authorization
- Caching layer of any kind
- Message queues, event buses, or background workers
- Planner/critic agents, reflection loops, or meta-agents
- A second MCP server
- A fourth specialist agent, or any new agent of any kind
- Payment processing
- Cloud deployment infrastructure (this is a local-process hackathon demo)
- New crops beyond tomato/wheat, or new disease keys beyond the 6 listed
- Retries on `E_RATE_LIMITED`
- Parallel fan-out to multiple specialists in one turn

If a request — from a human or an AI assistant's own suggestion —
implies any of the above, refuse and point back to this list.

---

## 14. AI Assistant Instructions

*(Applies equally to Claude, ChatGPT, Antigravity, and any other coding
assistant used on this project.)*

- Read `PROJECT_RULES.md` §2–§6 before generating any code.
- Never invent a file, agent, tool, or schema not already defined in
  the approved documents.
- Never "helpfully" add error handling, retries, caching, or
  abstraction beyond what's specified — treat under-engineering as
  correct, not incomplete.
- When a system prompt or schema is needed, copy it verbatim from its
  source doc — do not regenerate it from a description.
- If an approved doc is ambiguous, stop and ask rather than guessing
  and expanding scope.
- Every code-writing task must cite which `IMPLEMENTATION_ROADMAP.md`
  task ID it corresponds to.
- Do not modify any of the six approved documents. If a genuine error
  is found in one, flag it in the response — do not silently patch it.

---

## 15. Allowed vs. Forbidden Changes

| Allowed | Forbidden |
|---|---|
| Writing code that implements an approved file's stated responsibility | Adding a responsibility to a file beyond its `FILE_BLUEPRINT.md` entry |
| Fixing a bug that violates an approved contract | Changing a contract to make a bug "easier" to fix |
| Adding inline code comments | Adding new architecture diagrams or design docs |
| Adjusting variable/function names for clarity within a file's own scope | Renaming public symbols (`root_agent`, tool names) that other files depend on |
| Adding a dependency listed as needed in `SPEC.md`'s tech stack | Adding any dependency implying DB/cache/queue/auth |
| Editing `README.md` / `demo_script.md` content | Editing `SPEC.md`, `ARCHITECTURE.md`, `FILE_BLUEPRINT.md`, `AGENT_SPECIFICATIONS.md`, `API_CONTRACTS.md`, or `IMPLEMENTATION_ROADMAP.md` |
| Marking an `IMPLEMENTATION_ROADMAP.md` task complete once verified | Reordering or skipping a task's stated dependencies |

---

## 16. Definition of Project Completion

The project is done when, and only when:

- [ ] Every task in `IMPLEMENTATION_ROADMAP.md` (Phases 0–7) is
      complete and verified per its own Definition of Done
- [ ] Every row of `ARCHITECTURE.md` §9 error table is confirmed
      working end-to-end
- [ ] `demo_script.md` runs unmodified, start to finish, without
      manual intervention
- [ ] The live file tree matches `ARCHITECTURE.md` §7 exactly — no
      extra files, no missing files
- [ ] §13 "Scope Control" list contains zero violations anywhere in
      the codebase
- [ ] `README.md` alone is sufficient for a stranger to run the demo
- [ ] No PII, database, or persistent store exists anywhere in the
      repository

Once all seven boxes are checked, the build is submission-ready.
Nothing beyond this checklist is required or expected.

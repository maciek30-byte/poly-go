---
name: prd
description: >
  Generate context/foundation/prd.md from shape-notes.md (or raw notes) against
  the locked PRD schema. Auto-routes to greenfield (6 sections) or brownfield
  (7 sections) template based on context_type in shape-notes.md or cwd
  auto-detection. Use when the user has shaping notes ready and wants a
  schema-conformant PRD written to disk. Trigger phrases: "write the PRD",
  "generate PRD", "create the PRD from notes", "stwórz PRD", "turn notes into a
  PRD", "PRD from shape-notes". Use AFTER /shape-notes, not in place of it.
argument-hint: "[path-to-notes-file]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
---

# PRD: Generate context/foundation/prd.md from shape-notes

This skill is the second link in the bootstrap chain. For greenfield: `/shape-notes → /prd → 10x-tech-stack-selector → bootstrapper`. For brownfield: `/shape-notes → /prd → 10x-stack-assess → 10x-health-check`. Its single job: take a shaped notes file and emit a `context/foundation/prd.md` that conforms to the locked PRD schema. Missing content lands as `# TODO: <what's missing>` inline in the relevant section — never invented.

The skill auto-routes to the correct template based on `context_type` in the input:
- **greenfield** → 6-section PRD template
- **brownfield** → 7-section PRD template (adds `## Current System Overview`)

The skill is a **document generator**, not a discovery facilitator. It NEVER invents domain decisions, business logic, user stories, or access control rules. Anything missing in the input becomes an inline `# TODO` in the relevant section.

The locked schema lives at `../shape-notes/references/prd-schema.md`. Read it before generating any artifact and re-check the produced file against it before writing to disk.

## When to use, when to skip

**Use when**: the user has run `/shape-notes` and `context/foundation/shape-notes.md` exists with a checkpoint block, OR the user has raw notes they want turned into a PRD draft, OR the user explicitly asks to (re-)generate `context/foundation/prd.md`.

**Skip when**: the user is still ideating and has no notes — point at `/shape-notes` first. Skip also when the user wants to surgically edit an existing PRD — this skill writes whole files.

## Relationship to other skills

- `/shape-notes` — produces `shape-notes.md`, the canonical input.
- `10x-tech-stack-selector` — downstream for **greenfield**. Reads product-level frontmatter as priors; runs its own interview for team composition, language preferences, deployment, CI/CD.
- `10x-stack-assess` — downstream for **brownfield**. Evaluates existing stack against quality gates.
- `/10x-frame`, `/plan` — unrelated; PRD is a foundation artifact, not a per-change plan.

## Initial Response

When invoked:

1. **Path argument provided** (e.g. `/prd @notes/raw.md`) — capture it as the input path. Proceed to Step 1.
2. **No argument** — default to `context/foundation/shape-notes.md`. Proceed to Step 1.

## Process

### Step 1: Locate input

Resolve the input path (strip leading `@` if present). Default: `context/foundation/shape-notes.md`.

```bash
test -f "<resolved-path>"
```

If exists → read FULLY, proceed to Step 1.5.

If missing → ask:

AskUserQuestion:
- question: "No input file found at `<resolved-path>`. How would you like to proceed?"
  header: "Input?"
  options:
    - label: "Run /shape-notes first (Recommended)"
      description: "Stop here. Run /shape-notes to produce shape-notes.md, then re-invoke /prd."
    - label: "Paste raw notes"
      description: "I'll wait for you to paste any notes you have."
    - label: "Cancel"
      multiSelect: false

On "Run /shape-notes first": print redirect and STOP.
On "Paste raw notes": prompt for input, capture as in-memory content. Proceed to Step 1.5.
On "Cancel": STOP.

### Step 1.5: Determine context type

1. **`context_type:` in frontmatter** → use directly. No confirmation needed.
2. **No `context_type:`** → auto-detect from cwd (same multi-signal detection as `/shape-notes` Step 0.7: Tier 1 git history, Tier 2 lockfiles, Tier 3 manifest, bonus signals). Confirm with user:

AskUserQuestion:
- question: "No context_type found in input. Based on cwd markers, this looks like [greenfield|brownfield]. Correct?"
  header: "Context"
  options:
    - label: "[Detected mode] — correct (Recommended)"
    - label: "[Other mode] — override"
      multiSelect: false

Store resolved `context_type`. Proceed to Step 2.

### Step 2: Assess input

Score the input on a 0–3 shaped-vs-thin heuristic. Each signal contributes 1 point:

1. **Frontmatter `checkpoint:` block present** — strongest signal this came from `/shape-notes`.
2. **At least one US-NN format user story** — grep for `^US-\d{2}: ` in the body.
3. **Explicit business-logic capture** — a `## Business Logic` section exists AND its first non-blank line is a single declarative sentence (≤ 200 chars, ends in `.`, not a TODO placeholder).

Print the assessment:

```
Input assessment (heuristic, 3 signals, 1 point each):
  [✓|✗] Frontmatter checkpoint block        — <found|missing>
  [✓|✗] US-NN format user stories           — <found N stories|missing>
  [✓|✗] Explicit one-sentence business rule  — <found|missing>

  Score: <N>/3
```

**Score ≥ 2**: proceed to Step 3 silently.

**Score < 2**: trigger thin-input warning. Name each missing signal and its consequence:

```
This input scored <N>/3 on the shape heuristic. Missing signals:

  - <signal name>: <one-line consequence for the generated PRD>

A PRD generated from thin input will have inline # TODO placeholders.
That's a valid intermediate state, but /shape-notes first produces a
substantially stronger result.
```

AskUserQuestion:
- question: "How would you like to proceed?"
  header: "Thin input"
  options:
    - label: "Run /shape-notes first (Recommended)"
    - label: "Proceed anyway — missing pieces become # TODO inline"
    - label: "Cancel"
      multiSelect: false

On "Run /shape-notes first": redirect and STOP.
On "Proceed anyway": continue to Step 3 with `score < 2` recorded.
On "Cancel": STOP.

### Step 3: Generate PRD

Re-read `../shape-notes/references/prd-schema.md` fully to confirm field list and section names.

Build PRD content **in memory first**.

#### 3a. Frontmatter

Populate every required field per schema:

- `project` — from input frontmatter `project:`, or a Title heading (`# <Project>`), or `# TODO: project`.
- `version` — `1` for first write. Collision step (Step 4) bumps this for versioned saves.
- `status` — `draft`. Never promote here.
- `created` — today: `date +%Y-%m-%d`.
- `context_type` — from Step 1.5.
- `product_type` — from input if available; otherwise `# TODO: product_type`.
- `target_scale` — from input if available; otherwise `# TODO: target_scale`.
- `timeline_budget` — from input if available; otherwise `# TODO: timeline_budget`. For brownfield: uses `delivery_weeks` instead of `mvp_weeks`.

**Do NOT populate** `team_profile`, `tech_preferences`, or `deployment_constraint` — those belong to the downstream tech-stack-selection / stack-assessment step. If the input carries them, route to the Step 5 hand-off message, not PRD frontmatter.

#### 3b. Required sections (in schema order)

Section list depends on `context_type`:

**Greenfield (6 sections, in this exact order):**

1. `## Vision & Problem Statement`
2. `## User & Persona`
3. `## User Stories`
4. `## Business Logic`
5. `## Non-Functional Requirements`
6. `## Access Control`

**Brownfield (7 sections, in this exact order):**

1. `## Current System Overview`
2. `## Vision & Problem Statement`
3. `## User & Persona`
4. `## User Stories`
5. `## Business Logic`
6. `## Non-Functional Requirements`
7. `## Access Control`

**Do NOT emit** `## Success Criteria`, `## Functional Requirements`, `## Non-Goals`, `## Open Questions`, `## Data Model`, `## Implementation Decisions`, `## Testing Strategy`, or `## Deployment & CI/CD` — those sections do not exist in the schema. If the input notes carry that content, route it to the Step 5 hand-off message under "forward to technical-roadmap", not into PRD.

#### Section content rules (both modes)

For each section:

- **Input has matching content** — transcribe faithfully. Preserve user wording. Convert formatting only when schema demands a specific shape (e.g. `US-NN:` format for user stories).
- **Input has partial content** — transcribe what's there, close with `# TODO: <what's missing>` inline at the end of that section.
- **Input has no matching content** — emit heading plus `# TODO: <section name> not captured in shape notes`.

**Missing business rule**: if there is no one-sentence rule in the input, `## Business Logic` MUST read `# TODO: domain rule not captured — PRD is hollow until resolved`. Do not extrapolate a rule from entity nouns in user stories. The point is to surface the gap, not paper over it.

**User Stories format**: each story is a single sentence on one line:
```
US-01: User can register and log in with email and password
US-02: User sees a dashboard showing their recent activity and alerts
```
No Given/When/Then, no acceptance criteria, no sub-bullets. If the input has richer story content, strip it to the one-sentence form and route the detail to "forward to technical-roadmap" in the hand-off.

**Brownfield-specific rules:**
- `## Current System Overview` maps from shape-notes' `## Current System` section. This section MAY name specific technologies — it describes current reality, not a stack choice.
- All other sections are delta-framed: describe what changes, not the full system.
- If a section is unchanged (e.g. access control), note it: `Auth unchanged — current model preserved.`

#### 3c. Pre-write self-review

Before any disk write, run a self-review pass:

**Structural checks:**

1. Extract every `## ` heading from the in-memory PRD.
2. Compare to the canonical section list for the active `context_type` (6 for greenfield, 7 for brownfield). ALL sections must be present, in order, exact spelling.
3. Verify the frontmatter declares all required keys: `project`, `version`, `status`, `created`, `context_type`, `product_type`, `target_scale`, `timeline_budget`.
4. Verify NO retired sections are present: `## Success Criteria`, `## Functional Requirements`, `## Non-Goals`, `## Open Questions`, `## Data Model`, `## Scope of Change`, `## Constraints & Compatibility`, `## Business Logic Changes`, `## Access Control Changes`.

**Content-level lint for technical leak:**

Scan all `##`-level section bodies (excluding brownfield `## Current System Overview`) for implementation detail that has leaked into the PRD. Each hit is a leak unless it is part of a verbatim `# TODO` placeholder:

- **Vendor / hosted-service names**: OpenRouter, Stripe, Auth0, Supabase, Firebase, Vercel, Cloudflare, AWS, GCP, Azure, OpenAI, Anthropic, and any other proper-noun product/service.
- **Schema / ORM notation**: `(FK)`, `nullable`, `_hash`, `_at` column suffixes as field lists, `password_hash`, `cascade`, `soft-delete`, `hard-delete`, `migration`, `backfill`.
- **Runtime location**: `client-side`, `server-side`, `on the edge`, `in the cache`, `in the worker`.
- **Enforcement mechanism**: `per IP`, `per user-agent`, `token bucket`, `rate-limit per <axis>`.
- **UI affordance in NFRs**: `spinner`, `progress bar`, `streaming response`, `modal`, `toast`.
- **Transport / protocol**: `WebSocket`, `gRPC`, `GraphQL`, `REST endpoint`, `webhook`, `SSE`.
- **Implementation verbs in business logic**: "the LLM does X", "the database stores Z", "the SRS library decides Y".

If any structural OR lint check fails, **abort the write** and report:

```
PRD generation self-review FAILED:

  Structural:
    - <specific failure>

  Technical leak:
    - <section name>: "<offending phrase>" — <category>

The PRD was NOT written. For structural failures: schema and generator have
drifted — re-read ../shape-notes/references/prd-schema.md and reconcile.
For leak failures: rewrite the offending phrasings as outside-observable
properties, or move the content into shape-notes' ## Forward: ... blocks
for a downstream skill to consume.
```

Then STOP.

If all checks pass, proceed to Step 4.

### Step 4: Collision check

```bash
test -f context/foundation/prd.md
```

If not exists → write to `context/foundation/prd.md`, proceed to Step 5.

If exists → ask:

AskUserQuestion:
- question: "context/foundation/prd.md already exists. How would you like to proceed?"
  header: "Collision"
  options:
    - label: "Save as prd-vN.md (Recommended)"
      description: "Preserve history. New PRD lands at the next available prd-vN.md slot."
    - label: "Overwrite prd.md"
      description: "Replace existing prd.md. Prior version is lost unless committed."
    - label: "Abort"
      multiSelect: false

On "Save as prd-vN.md": scan `context/foundation/` for `prd-v*.md`. Treat unversioned `prd.md` as v1. Next slot: `N = (max existing N or 1) + 1`. Write to `context/foundation/prd-v<N>.md`, bump `version:` to `<N>`.

On "Overwrite": write to `context/foundation/prd.md`, keep `version: 1`.

On "Abort": STOP.

### Step 5: Hand off

```
═══════════════════════════════════════════════════════════
  PRD GENERATED
═══════════════════════════════════════════════════════════

  Project:          [project from frontmatter]
  Context type:     [greenfield | brownfield]
  Path:             [context/foundation/prd.md | prd-vN.md]
  Schema sections:  [N / 6 | N / 7] present
  Frontmatter:      <K populated, M as TODO>
  TODO placeholders: <count> inline

  Sections fully populated:
    - <list>

  Sections with # TODO (incomplete input):
    - <list>

═══════════════════════════════════════════════════════════
```

Copy next-step command to clipboard:

**Greenfield:**
```bash
echo -n "/10x-tech-stack-selector" | pbcopy 2>/dev/null || echo -n "/10x-tech-stack-selector" | clip.exe 2>/dev/null || echo -n "/10x-tech-stack-selector" | xclip -selection clipboard 2>/dev/null || true
```
```powershell
Set-Clipboard "/10x-tech-stack-selector"
```
```
► Next: /10x-tech-stack-selector  (✓ copied to clipboard)

        Picks up team composition, language preferences, deployment
        target, CI/CD shape. None of those are in this PRD by design.
```

**Brownfield:**
```bash
echo -n "/10x-stack-assess" | pbcopy 2>/dev/null || echo -n "/10x-stack-assess" | clip.exe 2>/dev/null || echo -n "/10x-stack-assess" | xclip -selection clipboard 2>/dev/null || true
```
```powershell
Set-Clipboard "/10x-stack-assess"
```
```
► Next: /10x-stack-assess  (✓ copied to clipboard)

        Evaluates your existing stack against quality gates and
        produces a compensation plan.
```

If the input carried forward-looking content (tech preferences, implementation notes, deploy hints):

```
  Forward to next step (not in PRD):
    • [one-line summary per item]
```

STOP. Do not chain automatically.

## Critical guardrails

1. **Generator, not author.** Never invent business logic, user stories, NFR targets, or access control rules. Missing content becomes `# TODO` inline. The `## Business Logic` section is the most-policed: no one-sentence rule in input → `# TODO: domain rule not captured — PRD is hollow until resolved`. No exceptions.

2. **Schema is the contract.** Re-read `../shape-notes/references/prd-schema.md` at every invocation. Validate in-memory PRD against it in Step 3c before writing. Drift between skill and schema is the failure mode this skill exists to prevent.

3. **Stack openness is binding.** Forbidden in all sections except brownfield `## Current System Overview`:
    - Vendor / hosted-service names (Stripe, Auth0, Supabase, Vercel, AWS, etc.)
    - Schema / ORM notation (FK, nullable, _hash columns, cascade-delete, migration, backfill)
    - Runtime location (client-side, server-side, on the edge, in the cache)
    - Enforcement mechanism (per IP, token bucket, rate-limit per axis)
    - UI affordance in NFRs (spinner, progress bar, modal, toast)
    - Transport / protocol (WebSocket, gRPC, GraphQL, REST endpoint, SSE)
    - Implementation verbs in business logic ("the LLM does X", "the database stores Z")

   If the input contains any of the above outside of `## Current System Overview`, it goes to the Step 5 hand-off under "forward to next step", not into PRD. Step 3c's lint enforces this mechanically.

4. **Collisions favor history.** Versioned save (`prd-vN.md`) is the recommended collision resolution. Lost prior versions are unrecoverable; a duplicate file is not.

5. **Self-review aborts on drift.** Missing section, wrong order, retired section present, or missing frontmatter key → write ABORTED, not silently patched.

6. **Universal language only.** No 10xDevs / cohort / certification references in any user-facing output or artifact.

7. **Never chain automatically.** Hand-off is an announcement, not an invocation.

## Notes

- Output is `context/foundation/prd.md` (or `prd-vN.md`), period.
- The schema reference is the single source of truth. Any field name or section name in this body MUST exist in the schema doc.
- The thin-input heuristic (Step 2) is intentionally conservative — false positives are recoverable via "Proceed anyway"; false negatives produce hollow PRDs. Tune toward warning more.
- The `# TODO: <description>` pattern is load-bearing. Downstream tooling can grep for `^# TODO:` to count unresolved gaps.
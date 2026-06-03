---
name: shape-notes
description: >
  Facilitate a structured discovery conversation that turns an idea —
  greenfield or brownfield — into shape-notes.md, the input to /10x-prd.
  Brownfield covers existing systems, new modules, new slices, and any
  scoped piece of a larger app. Auto-detects context type from project
  markers in cwd and adapts all discovery phases accordingly.
  Use when the user is starting a new product from scratch OR shaping
  a meaningful change, new module, or new slice in an existing system.
  Trigger phrases: "new project", "from scratch", "starting an app",
  "od pomysłu", "shape an idea", "I have an idea", "existing project",
  "brownfield", "istniejący projekt", "zmiana w projekcie", "new slice",
  "nowy moduł", "nowy kawałek", "nowa funkcjonalność".
  Use BEFORE /10x-prd, not in place of it.
argument-hint: "[freeform idea]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - Skill
---

# Shape: Facilitate Discovery (Greenfield & Brownfield) Before /10x-prd

This skill is the head of the bootstrap chain: `/10x-shape → /10x-prd → 10x-tech-stack-selector → bootstrapper` (greenfield) or `/10x-shape → /10x-prd → 10x-stack-assess → 10x-health-check` (brownfield). Its single job: walk a user from "I have an idea" or "I want to change/extend this system" to a structured `context/foundation/shape-notes.md` that `/10x-prd` can turn into a PRD conforming to the locked schema.

**Brownfield** in this skill means anything that is not a clean-slate new product: changes to an existing system, new modules added to an existing app, new slices (a scoped flow, a feature area, a panel), or significant features. If the user has something running and wants to plan a piece of it — that's brownfield.

The skill is a **facilitator**, not a content generator. It NEVER writes vision, user stories, business logic, or any other domain content the user did not say. Its value is the question shape and the order of questions.

The locked schema lives at `references/prd-schema.md`. Read it before producing any artifact and re-check at every checkpoint write.

## When to use, when to skip

**Use when**: the user describes a new product idea (greenfield), a meaningful change to an existing system, a new module, a new slice, or any scoped piece they want to plan properly. Use also when an existing `context/foundation/shape-notes.md` is incomplete and needs resuming.

**Skip when**: the project already has a PRD or ADR set (use `/10x-frame` or `/10x-plan`), or the user is reasoning about a single bug / small refactor that doesn't warrant a PRD (use `/10x-frame`).

## Relationship to other skills

- `/10x-init` — scaffolds the `/context` skeleton. `/10x-shape` requires `context/foundation/` to exist; if absent, delegates to `/10x-init` via the `Skill` tool.
- `/10x-prd` — consumes `shape-notes.md`.
- `/10x-frame` — for small-scope problems that don't need a PRD.
- `/10x-stack-assess` — downstream of `/10x-prd` for brownfield.
- `/10x-health-check` — downstream of `/10x-stack-assess` for brownfield.
- `/10x-plan` — downstream of `/10x-prd`, never invoked from here.

## Initial Response

When invoked:

1. **Freeform idea provided** (e.g. `/10x-shape a recipe app`) — capture verbatim as the seed idea. Proceed to Step 0.
2. **File path provided** (e.g. `/10x-shape @notes/idea.md`) — read it fully and use its contents as the seed. Proceed to Step 0.
3. **Nothing provided** — respond with:

```
I'll help you shape an idea into structured notes that /10x-prd can turn into
a real PRD — whether you're starting from scratch (greenfield) or planning a
change, new module, or new slice in an existing system (brownfield).

Please share:
1. The seed idea — what do you want to build or change, in your own words?
2. (Optional) Any rough notes, sketches, or links I should read

Tip: pass the idea inline — `/10x-shape a recipe app that uses fridge contents`
     or for brownfield — `/10x-shape add a recommendation engine to my recipe app`
```

Then wait.

## Process

### Step 0: Check 10xWorkflow precondition

```bash
test -d context/foundation
```

If exists → proceed to Step 0.5.

If missing → ask:

AskUserQuestion:
- question: "This directory isn't initialized for 10xWorkflow (context/foundation/ is missing). Run /10x-init now?"
  header: "Init?"
  options:
    - label: "Yes — run /10x-init (Recommended)"
      description: "Scaffolds the /context skeleton, then continues shaping."
    - label: "No — stop here"
      description: "Exit without changes."
      multiSelect: false

On "Yes": invoke `/10x-init` via the **Skill** tool. When it returns, re-check; if passes, continue to Step 0.5. On "No": print "Stopping. Run `/10x-init` when ready." and STOP.

### Step 0.5: Resume detection

```bash
test -f context/foundation/shape-notes.md
```

If absent → proceed to Step 1 with a fresh session.

If present → read it fully. Parse frontmatter `checkpoint:` block. Extract: `current_phase`, `phases_completed`, `user_stories_drafted`, `quality_check_status`.

Summarize:

```
Found a prior shape session at context/foundation/shape-notes.md:

  Project:                 [from frontmatter, or "(unnamed)"]
  Current phase:           [N — Phase name]
  Phases completed:        [list]
  User stories drafted:    [count]
  Quality check status:    [pending | warned | accepted]
```

Ask:

AskUserQuestion:
- question: "How would you like to proceed?"
  header: "Resume?"
  options:
    - label: "Resume from Phase [next] (Recommended)"
      description: "Pick up where the prior session left off."
    - label: "Restart from scratch"
      description: "Archive the existing shape-notes.md and start a new session."
    - label: "Cancel"
      description: "Exit without changes."
      multiSelect: false

On "Resume": jump to the next unfinished phase. Summarize each completed phase in 1–2 sentences. Do NOT replay completed phases.

On "Restart": move existing file to `context/foundation/archive/shape-notes-<YYYY-MM-DD-HHMM>.md`, then proceed to Step 1.

On "Cancel": STOP.

### Step 0.7: Context type detection

Detect once. Result written into shape-notes.md frontmatter and governs the rest of the session.

```bash
# Tier 1 (strong): version control with history
git log --oneline -1 2>/dev/null && echo "T1:git-history"

# Tier 2 (medium): lockfiles
ls package-lock.json yarn.lock pnpm-lock.yaml Cargo.lock poetry.lock go.sum Gemfile.lock composer.lock 2>/dev/null | while read f; do echo "T2:$f"; done

# Tier 3 (weak): manifest files only
ls package.json Cargo.toml pyproject.toml go.mod Gemfile composer.json 2>/dev/null | while read f; do echo "T3:$f"; done

# Bonus signals
ls -d src/ app/ lib/ .github/ .gitlab-ci.yml Dockerfile tsconfig.json next.config.* vite.config.* 2>/dev/null | while read f; do echo "B:$f"; done
```

```powershell
if (git log --oneline -1 2>$null) { "T1:git-history" }
@('package-lock.json','yarn.lock','pnpm-lock.yaml','Cargo.lock','poetry.lock','go.sum','Gemfile.lock','composer.lock') |
  Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { "T2:$_" }
@('package.json','Cargo.toml','pyproject.toml','go.mod','Gemfile','composer.json') |
  Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { "T3:$_" }
@('src','app','lib','.github','.gitlab-ci.yml','Dockerfile','tsconfig.json') |
  Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { "B:$_" }
```

Scoring:
- **T1 or T2 hit** → brownfield
- **T3 only** → ambiguous, propose brownfield, flag it
- **No signals** → greenfield

Print detection result and confirm:

AskUserQuestion:
- question: "Detected context: [greenfield|brownfield]. Is this correct?"
  header: "Context"
  options:
    - label: "[Greenfield|Brownfield] — correct (Recommended)"
    - label: "[Other mode] — override"
      multiSelect: false

Write confirmed `context_type` into shape-notes.md frontmatter immediately.

On resume: if shape-notes.md already has `context_type:`, skip detection — mode is locked.

### Discovery pattern (applies to every Step 1–5)

Every discovery phase follows the same loop:

1. **Open the phase** with a single open question. Never generate content the user did not say.
2. **Surface gray areas** as AskUserQuestion when the user's answer has ambiguities. Each option is a real position with a tradeoff.
3. **Mark recommended option** with "(Recommended)" and place it first. Always include a "Not sure / haven't decided" option.
4. **Lock the decision** back to the user as a one-line summary before writing to disk.
5. **Write the phase's sections** into `shape-notes.md` and bump checkpoint.

**Hard rules**:
- NEVER generate content the user did not say.
- NEVER pre-commit to a stack (framework, database, language, hosting).
- NEVER use 10xDevs / cohort / certification language in shipped output.

### Step 1: Vision & Problem

This phase produces `## Vision & Problem Statement` and seeds `## User & Persona`.

#### Greenfield mode

Open with: "Let's start with the pain. In one or two sentences — who has it, what's the moment they feel it, what does it cost them today?"

Echo back four components:

```
Pain:        [the literal problem]
Person:      [who has it — name a role, not "users"]
Moment:      [when they feel it]
Cost today:  [what they currently do, and what it costs them]
```

Challenge vague answers ("everyone", "always") with: "Who specifically have you seen experience this in the last month?"

Surface gray areas (AskUserQuestion, 2–3 questions):
- Pain category — workflow friction / missing capability / data trapped / decision paralysis / coordination overhead / other
- Insight — why hasn't this been built? (Socrates: "If your idea is obvious, why doesn't it exist?")
- Primary persona scope — specific role inside an org / individuals across many orgs / yourself / hobbyist niche / not sure

#### Brownfield mode

This covers existing system changes, new modules, AND new slices. Open with: "Tell me about what exists today and what you want to add or change. What's the system, who uses it, and what's the gap?"

Echo back:

```
Current system:  [what exists — name the product/service/module]
Scope of work:   [new module / new slice / feature change / architectural change]
Users affected:  [who uses it or will use the new piece]
Pain / gap:      [what's missing or wrong]
Must preserve:   [what must NOT break]
```

For slices specifically: "Is this slice standalone (its own UI/flow) or does it plug into an existing flow? What entry point does a user take to reach it?"

If "must preserve" is unclear: "If this change broke something tomorrow, what's the first thing your users would notice?"

Then surface gray areas:
- Scope type — new module with own UI / new slice in existing flow / feature addition / architectural change / other
- Integration points — what existing parts does this touch?
- Primary persona — same as greenfield

Write `## Current System Overview` (brownfield only), then `## Vision & Problem Statement`.

#### Both modes

Append to `shape-notes.md`. Bump `checkpoint.current_phase: 2`, append `1` to `phases_completed`.

### Step 2: Persona & Access Control

This phase produces `## Access Control` and completes `## User & Persona`.

Open with: "How does this person get into the app? And are there different types of users who see different things?"

Ask two questions via AskUserQuestion:

**Question 1 — Auth:**
- Login (email + password / OAuth / passwordless) — for multi-user apps
- Local profile — data on-device, no server
- Access key / token — no account creation
- No auth — single user, single device
- Not sure yet

**Question 2 — Roles:** "Does everyone see the same thing, or are there different access levels?"
- Flat — all users have the same access (Recommended for simple apps)
- Roles — describe which roles and what each can do
- Not sure yet

For brownfield/slice: "Is auth changing as part of this work, or is it unchanged?" If unchanged, record current model with note: `Auth unchanged — current model preserved.`

Socrates: "What's the smallest access model that makes this useful without over-engineering it?"

Write `## Access Control` and complete `## User & Persona`. Bump `checkpoint.current_phase: 3`, append `2` to `phases_completed`.

### Step 3: MVP scope & timeline

This phase seeds `timeline_budget` frontmatter and establishes the delivery scope.

#### Greenfield mode

Open with: "Sketch the smallest end-to-end flow that would prove this product works. Walk me through the first session, step by step."

Echo back as a numbered sequence. Then ask: "If you had three weeks of after-hours work, can you ship this?"

**Scope-cost surface**: if the flow has more than ~6 distinct user actions before producing value, OR the estimate exceeds ~3 weeks, OR requires multiple integrations before any user-visible payoff, surface explicitly:

```
This first version is bigger than what typically ships in three weeks of
after-hours work. The greenfield trap is shipping nothing because the first
version was too big to finish.

  Scope down — keep the timeline tight. Common moves:
    - Drop [identified expensive piece] for v1.
    - Replace [identified integration] with a manual version for now.
    - Cut the user count to one (yourself) for v1.

  Commit to the longer timeline — own the cost. Multi-week MVPs are doable
  but require sustained dedication over evenings and weekends. Most greenfield
  projects die not from the work itself but from the gap between expected and
  actual effort.
```

AskUserQuestion:
- label: "Scope down (Recommended)"
- label: "Commit to the longer timeline — I understand the cost"
- label: "Restart Step 3 with a different first flow"

If "Commit": capture `mvp_weeks`, append `## Timeline acknowledgment` to shape-notes: `Acknowledged on <YYYY-MM-DD>: <N>-week MVP requires sustained dedication; user accepted.`

#### Brownfield mode

Open with: "What's the smallest slice of this work that proves the change is valuable? What does a user do differently after it ships?"

Echo back as a numbered delta-sequence. Then:
- "What's the blast radius — which existing features or flows could break?"
- "If you had three weeks of after-hours work, can you ship this?"

**Scope-cost surface** — same logic, brownfield framing:

```
This change is bigger than what typically ships in three weeks. The brownfield
trap is leaving a large change half-done — partially modified code is worse
than the original.

  Scope down — find the smallest slice that proves the change works.
  Commit to the longer timeline — same cost acknowledgment as greenfield.
```

Same AskUserQuestion options.

#### Both modes

Set `timeline_budget.mvp_weeks` in frontmatter. Bump `checkpoint.current_phase: 4`, append `3` to `phases_completed`.

### Step 4: User Stories & Business Logic

This phase produces `## User Stories` and `## Business Logic`.

#### User Stories

Open with: "Let's map the main blocks. What are the key things a user can do in this product/slice? Don't go deep — think main flows, not sub-tasks."

Capture each as a single-sentence US entry:

```
US-01: User can [main capability]
US-02: User can [main capability]
```

These are the top-level building blocks of the roadmap — not implementation tasks, not detailed acceptance criteria. If the user starts going deep ("and then the system validates the email format and shows an error..."), redirect: "Keep it at the flow level — we'll get to details in the roadmap."

For brownfield/slice: focus on what's new or changed. "What can users do that they couldn't do before? What existing flows are changing?"

Update `checkpoint.user_stories_drafted` to the count of US-NN entries.

#### Business Logic

Open with: "What's the one thing this product/slice *decides* for the user? Not what it stores or shows — what rule does it apply?"

If the user can produce the one-sentence rule, capture it as the first line of `## Business Logic`. Then ask for ≤ 3 supporting paragraphs covering: what inputs the rule consumes, what its output is, how the user encounters it. No technical details — state the rule as if the implementation were unknown.

**Empty-CRUD anti-pattern detection**: if the business logic reduces to "users can add, view, update, and remove records" with no rule the application itself applies, surface explicitly:

```
What you've described is a CRUD list — that's a known anti-pattern. CRUD
without a domain decision means the app provides no value a spreadsheet
couldn't. The product is hollow.

A real domain rule answers "what does the application decide for the user?":

  - Recommendation:  app suggests items based on user state
  - Prioritization:  app orders items by urgency / importance
  - Classification:  app tags items by category / quality
  - Validation:      app checks items against a domain rule
  - Scoring:         app rates items so the user can compare them
  - Workflow:        app moves items through states with transition rules
  - Calculation:     app computes a value from user inputs

What rule does YOUR product/slice apply?
```

AskUserQuestion with rule shapes as options (multi-select), plus "I want to add a rule — give me a moment" and "I'm building pure CRUD — record it".

For brownfield/slice: "Does this change add a new domain rule, modify an existing one, or is it infrastructure-only (no rule change)?" Classify and capture accordingly. Infrastructure-only is valid — record it explicitly.

Write `## User Stories` and `## Business Logic`. Bump `checkpoint.current_phase: 5`, append `4` to `phases_completed`.

### Step 5: Non-Functional Requirements & Product Framing

This phase produces `## Non-Functional Requirements` and locks the product-level frontmatter fields.

#### Non-Functional Requirements

Open with: "Are there qualities this product/slice must hold at its outer boundary — things a user, operator, or regulator could measure? Think: accessibility, language support, performance as the user perceives it, browser support, privacy commitments."

Capture as `## Non-Functional Requirements` bullets. Each NFR pairs a property with a measurable target (or a binary commitment). No mechanism, no enforcement detail, no UI affordance.

If the user phrases an NFR mechanically ("rate-limit per IP", "spinner during load"), reflect it back in outside-observable form before capturing: "auth resists credential stuffing" / "continuous visible feedback during any operation > 2s".

For brownfield/slice: "Are there existing NFRs this change must not regress?"

#### Product framing

Ask three short questions, ONE AT A TIME:

**1. What kind of thing are you building?**
Options: "A website or web app" / "An API or backend service" / "A command-line tool" / "A mobile app" / "A desktop app" / "A library or SDK" / "A data pipeline" / other.
Map to `product_type`.

For brownfield/slice: "Is the product type changing, or is this extending an existing [type]?" If unchanged, record as-is.

**2. Roughly how many people will use this once it's live?**
Options: "Just me, or a handful" / "Dozens to a hundred" / "Up to ten thousand" / "More than ten thousand".
Map to `target_scale.users`.

**3. Two quick timing questions.**
- "Is there a hard deadline? If yes, what date." → `timeline_budget.hard_deadline`
- "After-hours work or day job?" → `timeline_budget.after_hours_only`

`mvp_weeks` was locked in Step 3 — don't re-ask.

Write `## Non-Functional Requirements`, lock frontmatter fields. Bump `checkpoint.current_phase: 6`, append `5` to `phases_completed`. Proceed directly to Step 6.

### Step 6: Closing Challenge Round

This phase replaces the quality cross-check with a model-driven challenge. The model reviews everything captured and surfaces its own concerns — contradictions, gaps, things that seem off. The user decides what to do with each.

Read the full `shape-notes.md`. For each concern the model identifies, surface it with a specific challenge. This is NOT a checklist — it's genuine model judgment. The model asks only about things it actually finds unclear, contradictory, or missing.

Categories of challenges (not all need to appear — only raise what's actually found):

- **Contradiction**: "The persona is described as a solo user, but the access control has admin/member roles. Which is it?"
- **Missing domain rule**: "I don't see a clear domain decision. What does this app *decide* for the user?"
- **Scope creep risk**: "US-07 through US-11 look like they'd take more than the 3 weeks you said. Which ones are truly in the first version?"
- **Vague NFR**: "WCAG compliance is listed but the product is a CLI. Is this actually relevant?"
- **Brownfield gap**: "You said auth is unchanged, but US-03 requires a new admin role. These conflict."
- **Thin persona**: "The persona is described as 'developers' — that's too broad. Who specifically?"

For each concern, ask the user to resolve it via AskUserQuestion with 2–3 concrete resolution options. Include "Leave as-is — I'll resolve it later" as a last option (not first).

If a resolution changes a prior section, update that section in `shape-notes.md` in place.

Once all concerns are surfaced and resolved (or accepted as-is):

Set `checkpoint.quality_check_status`:
- `accepted` — if all concerns were resolved
- `warned` — if any "leave as-is" was chosen

Append `6` to `phases_completed`, bump `checkpoint.current_phase: 7`. Proceed to Step 7.

### Step 7: Hand off

Final write of `shape-notes.md`:

- Confirm `checkpoint.quality_check_status` is `warned` or `accepted`.
- Bump `updated:` to today's date.
- Re-validate against schema reference: greenfield body anticipates 6 PRD sections in schema order; brownfield anticipates 7. Frontmatter has full `checkpoint:` block plus `context_type`.

Copy next-step command to clipboard:

```bash
echo -n "/10x-prd" | pbcopy 2>/dev/null || echo -n "/10x-prd" | clip.exe 2>/dev/null || echo -n "/10x-prd" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
Set-Clipboard "/10x-prd"
```

Print:

```
═══════════════════════════════════════════════════════════
  SHAPE COMPLETE
═══════════════════════════════════════════════════════════

  Project:                [project name]
  Context type:           [greenfield | brownfield]
  Phases captured:        1, 2, 3, 4, 5
  User stories drafted:   [count]
  Challenge round:        [accepted | warned]

  ► Notes:  context/foundation/shape-notes.md
  ► Next:   /10x-prd  (✓ copied to clipboard)

  After /10x-prd:
    Greenfield → tech-stack selection, then bootstrap
    Brownfield → stack assessment, then health check
═══════════════════════════════════════════════════════════
```

STOP. Do not chain into `/10x-prd` automatically.

## Critical guardrails

1. **Facilitator, not generator.** Never write domain content the user did not say. Ask if a section needs a value the user hasn't provided. Exception: mechanical formatting (US-NN numbering, section headings, frontmatter keys).

2. **Schema is the contract.** Shape of `shape-notes.md` and PRD scaffold are dictated by `references/prd-schema.md`. Re-check at every checkpoint write.

3. **Stack openness is binding.** Never ask about, recommend, or commit to a framework, database, language, or platform. If the user volunteers stack content, capture it in `## Forward: tech-stack` — not in PRD-mapped sections.

4. **Anti-patterns are surfaced by name.** Empty-CRUD detection names the missing rule shapes. MVP-too-big detection names the expensive pieces and offers concrete scope-down moves. Generic "your idea has issues" warnings are useless.

5. **Soft gate, not hard gate.** The closing challenge round warns but allows override. Override paths are recorded as `quality_check_status: warned`. Refusing to finish is not in scope.

6. **Brownfield covers slices.** Any scoped piece of work on an existing or partially-existing system — new module, new slice, new flow, new feature area — is brownfield. The discovery questions shift from "what are you building from scratch?" to "what exists, what's changing or being added, what must be preserved?". For small-scope problems that don't warrant a PRD, suggest `/10x-frame` instead.

7. **Universal language only.** No 10xDevs / cohort / certification references in any user-facing output or any artifact written to disk.

8. **Resume preserves prior work.** On resume, completed phases are SUMMARIZED in 1–2 sentences each, never re-run.

## Notes

- Output is `shape-notes.md`, not `prd.md`. `/10x-prd` is the document generator.
- The schema reference (`references/prd-schema.md`) is the single source of truth.
- If the user pushes to skip a phase, explain the consequence, then offer to skip with the cost made explicit. The choice is theirs.
- Forward-looking content for downstream chain steps lives in `## Forward: tech-stack` or `## Forward: technical-roadmap` blocks — NOT in PRD-mapped sections.
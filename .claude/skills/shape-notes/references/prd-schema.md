# PRD Schema (canonical reference)

This doc is the single source of truth for the shape of `context/foundation/prd.md` produced by `/prd`, and for the `checkpoint:` block written into `context/foundation/shape-notes.md` by `/shape-notes`. Both skills load this file by relative path (`skills/10x-shape/references/prd-schema.md`) and conform to it.

Two contracts live here:

1. **PRD frontmatter + required sections (6 greenfield / 7 brownfield)** — what `prd.md` must contain.
2. **shape-notes.md checkpoint format** — what `shape-notes.md` must carry so a session can resume from disk.

Renames or restructurings of either contract are load-bearing. Update this doc *first*, then both skill bodies, then any sibling change folder that points at it.

PRD frontmatter captures only **product-level priors** — what the product/slice is, who it's for, when it ships. Fields that depend on team composition, runtime, or deployment target belong to a separate downstream tech-stack-selection step, not to PRD.

# Frontmatter fields

Every PRD declares this YAML frontmatter block. Field order is suggested, not load-bearing; key names ARE load-bearing.

```yaml
---
project: <string>                    # human-readable project name, e.g. "Recipe Fridge"
version: <integer>                   # 1 for first PRD; bumped only when a versioned save lands
status: <enum>                       # draft | reviewed | locked
created: <YYYY-MM-DD>
context_type: <enum>                 # greenfield | brownfield
product_type: <enum>                 # web-app | api | cli | mobile | desktop | library | data-pipeline | other
target_scale: <object>               # { users: <small|medium|large|enterprise>, qps: <ballpark>, data_volume: <ballpark> }
timeline_budget: <object>            # { mvp_weeks: <int>, hard_deadline: <YYYY-MM-DD | null>, after_hours_only: <bool> }
---
```

Field semantics:

- **`project`** — short proper-noun name. Never invented by the skill; always provided by the user.
- **`version`** — starts at `1`. Versioned saves (`prd-v2.md`) increment this.
- **`context_type`** — `greenfield` for new products built from scratch; `brownfield` for changes to existing systems, new modules, or scoped slices within an existing or new app. Set by `/10x-shape`'s auto-detection; `/10x-prd` reads it from `shape-notes.md` frontmatter.
- **`status`** — `draft` on first write.
- **`product_type`** — enum + free-text fallback.
- **`target_scale.users`** — `small` (single-digit), `medium` (≤ 100), `large` (≤ 10k), `enterprise` (≥ 10k).
- **`timeline_budget.mvp_weeks`** — integer week count for the first shippable version. For brownfield/slice: weeks to deliver the scoped change.

Stack-shaped concerns — team composition, language preferences, deployment mode, CI/CD shape — are intentionally absent from this frontmatter.

Example (minimal but valid):

```yaml
---
project: "Recipe Fridge"
version: 1
status: draft
created: 2026-05-03
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---
```

# Required PRD sections (in order)

A conforming `prd.md` contains a set of `##`-level headings determined by `context_type`. Greenfield uses 6 sections; brownfield uses 7 sections (adds `## Current System Overview`). Section names are the contract — downstream parsers split on them.

# Greenfield PRD Sections (6 sections)

## Vision & Problem Statement

Two paragraphs max. First paragraph: the specific pain (named user, named situation, named cost). Second paragraph: the insight that makes this worth building — what does the team understand that the status quo doesn't.

No marketing language. State the pain and the insight as facts.

## User & Persona

One primary persona. Name, role, context, the moment they reach for this product. Secondary persona gets `### Secondary persona` — keep it short.

## User Stories

A flat list of the main functional blocks from the user's perspective. No Given/When/Then, no acceptance criteria, no technical details. Each story is one sentence describing what the user can do.

Format:
```
US-01: User can register and log in with email and password
US-02: User sees a dashboard showing their recent activity, stats, and alerts
US-03: User can add a recipe by entering a name and list of ingredients
```

Index is two-digit zero-padded. Count depends on the product — there is no target number.

Stories describe *what*, not *how*. They are the main building blocks of the roadmap, not implementation tasks.

## Business Logic

**One sentence first.** A single declarative sentence capturing the domain rule that makes this product non-trivial. If you cannot write this sentence, the product is empty CRUD.

After the one-sentence rule, supporting paragraphs (≤ 3) explain: what inputs the rule consumes (as user-facing inputs, not system components), what its output is, and how the user encounters it in the product flow. No technical implementation details — state the rule as if the implementation were unknown.

For brownfield/slice: if the change is infrastructure-only (no domain logic change), state that explicitly: "No domain logic change. This is an infrastructure/technical change."

If the empty-CRUD anti-pattern was flagged and the user accepted without choosing a rule, write `# TODO: domain rule` here.

## Non-Functional Requirements

Bulleted. Each NFR is a property an outside observer — a user, an operator, a regulator — can measure without inspecting the implementation. Pair the property with a measurable target where one exists.

Do not name mechanism, enforcement strategy, or UI affordance. The NFR says **what must be true at the product's outer boundary**.

Examples:
- The product must support WCAG 2.1 AA accessibility standards.
- The interface must be available in Polish and English.
- Any user action must be acknowledged within 200ms.
- The product must remain usable on the latest two major versions of mainstream desktop browsers.

## Access Control

Who is allowed to do what. Even single-user local apps need this section — write `Single user; no auth; data lives on-device only.` and move on.

If multi-user: how many surfaces (web, mobile, admin panel), roles, what each role can do. For brownfield/slice: describe only what's relevant to this slice — if auth is unchanged, note it: `Auth unchanged — current model preserved.`

# Brownfield PRD Sections (7 sections)

When `context_type: brownfield`, the PRD adds one section at the top and uses delta-framing throughout: sections describe what changes, not the full system. This applies equally to new modules, significant features, architectural changes, and scoped slices within an existing app.

## Current System Overview

What exists now. Unlike the greenfield "stack openness" rule, this section MAY name specific technologies because it describes reality, not a choice.

Required content:
- System purpose (one sentence)
- Tech stack (languages, frameworks, databases, infrastructure)
- Current user base (who uses it, rough scale)
- Core functionality (what it does today)
- For slices: which part of the system this slice lives in or connects to

Then the remaining 6 sections follow, all delta-framed:

## Vision & Problem Statement

What's wrong or missing, and why now. Focuses on the gap between current state and desired state.

## User & Persona

Who is affected by this change — existing users whose experience changes, plus any new users this change enables.

## User Stories

Same format as greenfield but delta-framed: describes the new or changed behavior. For slices: stories scoped to the slice only.

## Business Logic

Same as greenfield but delta-framed. Only the rule that's changing or being added. Infrastructure-only changes say so explicitly.

## Non-Functional Requirements

Same as greenfield. For brownfield: include any existing NFRs that must not regress.

## Access Control

Same as greenfield but delta-framed. If unchanged: `Auth unchanged — current model preserved.`

# shape-notes.md checkpoint format

`/10x-shape` writes `context/foundation/shape-notes.md` with a frontmatter `checkpoint:` block that drives resume behavior.

```yaml
---
project: <string|null>
context_type: <enum>                       # greenfield | brownfield — set during Step 0.7
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
checkpoint:
  current_phase: <integer>                 # 1..6 during session, 7 during challenge round, 8 finalized
  phases_completed: [<integer>, ...]
  gray_areas_resolved:
    - topic: <string>
      decision: <string>
  user_stories_drafted: <integer>          # count of US-NN entries currently in shape-notes.md
  quality_check_status: <enum>             # pending | warned | accepted
---
```

`current_phase` semantics:

- `1..5` — discovery phases (Vision, Persona & Access, MVP, User Stories & Business Logic, NFRs & Framing).
- `6` — closing challenge round in progress.
- `7` — finalized; ready for `/prd`.

`quality_check_status` semantics:

- `pending` — challenge round not yet run.
- `warned` — challenge round ran, model surfaced concerns, user accepted override.
- `accepted` — challenge round ran, no concerns.

On re-entry, `/shape-notes` reads `current_phase` and `phases_completed` and resumes at the next unfinished phase. Completed phases are summarized, never replayed.

# How `/shape-notes` and `/prd` use this doc

- `/shape-notes` auto-detects context type (greenfield vs brownfield) from cwd. For brownfield, "brownfield" covers existing systems, new modules in existing systems, and scoped slices — anything that's not a clean-slate new product. It writes `context_type` into shape-notes.md frontmatter and produces a body that anticipates the PRD sections in order. It writes the `checkpoint:` block per the format above.
- `/prd`` reads `shape-notes.md`, determines `context_type` from frontmatter, maps captured content into the correct section list (6 greenfield / 7 brownfield) in order. Content outside the PRD schema (forward-looking notes for downstream chain steps) is summarized into the hand-off message — not copied into PRD.

# Drift detection

If a maintainer renames a PRD section or restructures frontmatter, the failure mode is silent drift between this doc and the skills. The mitigation:

1. Edit this doc first.
2. Grep both skill bodies for the old name; update.
3. Re-run any local skill validators the project provides.
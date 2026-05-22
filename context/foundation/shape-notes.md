---
project: "polyGo"
context_type: greenfield
created: 2026-05-19
updated: 2026-05-19
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain shape"
      decision: "trust verification (primary) + discovery/sourcing + coordination overhead"
    - topic: "moat / insight"
      decision: "manual verification at the door + niche-specific scope (Polish plastics industry only)"
    - topic: "primary persona"
      decision: "trading employee (buyer/seller); company owner is secondary"
    - topic: "entry path"
      decision: "two-tier: polyGo team emails invite to Company Owner; Company Owner emails invites to their Employees from inside the app"
    - topic: "role model"
      decision: "3 roles — Platform Administrator (polyGo team), Company Owner (per-company gatekeeper), Employee (daily user)"
    - topic: "verification scope"
      decision: "NIP + KRS legal-entity check + manual industry-fit judgment by polyGo team"
    - topic: "offboarding / chat retention"
      decision: "deactivated employee account locks login; chat history remains visible to Company Owner for RODO-compliant institutional memory"
    - topic: "MVP scope"
      decision: "directory (search + filter + profiles) + messenger (text + PDF up to 10MB) + favorites — all three core; scope NOT cut"
    - topic: "timeline budget"
      decision: "open-ended; no hard deadline; sustained-effort cost acknowledged by user"
    - topic: "guardrail"
      decision: "verified-only contact — users never see, search, or message an unverified company"
    - topic: "secondary success"
      decision: "≥60% of first 30 invited companies have an active employee 30 days post-onboarding"
  frs_drafted: 26
  quality_check_status: accepted
---

# polyGo — Shape Notes

> Seed: `docs/raw-idea.md`. Closed, invitation-only B2B platform for the Polish plastics industry (manufacturers, recyclers, raw-material suppliers, machinery vendors). Combines verified company directory + built-in messenger. Owner has 10+ years of industry experience and will manually onboard the first 20–30 companies.

## Vision & Problem Statement

Polish plastics-industry companies — manufacturers, recyclers, raw-material suppliers, machinery vendors — cannot reliably verify whether a new trading counterparty is honest. Public listing portals (OLX-style classifieds, generic B2B directories) are saturated with fake accounts and bad actors, and the parallel daily reality is that commercial conversations are scattered across personal email, mobile phone, and WhatsApp — so when a salesperson leaves, the company loses its institutional deal history with them. The cost is real: time burned on ad-hoc due diligence (manual NIP/KRS lookups, asking around at trade shows), occasional outright fraud losses, and silent knowledge erosion every time a staff member changes jobs.

The insight that makes polyGo worth building is that manual gatekeeping — explicitly refusing to be open — is the moat in this market, and that the Polish plastics industry is a finite, knowable population that can plausibly be onboarded warm one-by-one. Generic B2B platforms cannot replicate either: their economics demand open sign-up, and they have no domain insider doing the vouching. polyGo trades scale for trust, with a 10+yr industry insider personally verifying every company that gets in.

## User & Persona

**Primary: Trading employee** — a buyer or seller working inside a Polish plastics-industry company. Their day is spent identifying counterparties for material trades (PE, PP, PVC, PET, etc.), negotiating offers, and tracking deliveries. They reach for polyGo at the moment they have a sourcing or sales opportunity and need to find — and immediately contact — a credible partner. Their success is measured in conversations started with vetted counterparties, not in time spent inside the tool.

### Secondary persona
**Company Owner (per-company gatekeeper)** — the person who accepts polyGo's invitation, completes the company-level verification, fills in the company profile, invites employees, and (later) decides whether the company subscribes. They feel the verification pain most acutely (it's their reputation and money at risk) and also the staff-turnover pain (when an employee leaves, the Owner is the one who has historically lost the deal history). They are not the daily user, but their satisfaction in onboarding + retention-of-history controls whether any employee ever logs in. The MVP serves them through a thin onboarding/offboarding/history-retention surface; the primary product experience is built for the Employee.

## Access Control

Three roles in MVP, each defined by what they can do at a product boundary:

- **Platform Administrator** — a member of the polyGo team. There is one (or a very small group) of these for the whole platform. They are responsible for inviting Company Owners by email, running NIP + KRS verification on each company, applying manual industry-fit judgment, activating verified companies, and (when required for compliance or safety) locking employee or company accounts. The Platform Administrator surface in MVP is small but real — it is not just a back-office trick, it is a logged-in role inside the system.
- **Company Owner** — one per company. Accepts the polyGo invitation, fills in the company profile (legal data, materials handled, role types, location), and invites their own employees by email. The Company Owner retains read access to the company's chat history even after individual employees leave. The Company Owner is the contractual party for the (future) paid plan.
- **Employee** — one or more per company, invited by their Company Owner. Employee accounts can search the company directory, open chats with employees of other verified companies, exchange files, and maintain a favorites list. Employees cannot invite other employees and cannot see other companies' employees they have not yet contacted at a deeper level than the public profile.

**Sign-up vs sign-in:** sign-up is invitation-only at both tiers — there is no public registration form. A user who hits a gated route without authentication is redirected to the sign-in page; a user who is authenticated but whose account or company is locked sees a clear "account locked — contact polyGo" state rather than the application UI.

**Offboarding (RODO-aligned):** when an Employee leaves a company, the Company Owner deactivates that Employee's account from inside polyGo. Login is blocked from that moment; the chat history that Employee created on behalf of the company remains visible to the Company Owner and is part of the company's institutional record. The departed individual's personal data is handled per polyGo's privacy policy; the business correspondence (which legally belongs to the company, not the individual) is preserved.

## Success Criteria

### Primary
- A trading Employee at a verified company can, in a single session, search the directory by location + activity-type + material, open the profile of a relevant counterparty company, pick a specific employee from that company, open a chat with them, exchange a text message and a PDF attachment, and mark the counterparty company as a favorite. The end-to-end flow works without leaving polyGo.

### Secondary
- ≥ 60% of the first ~30 invited companies have at least one Employee logging in and using the directory or messenger 30 days after their company was activated. (Drawn from the raw idea's early-adopter target.)

### Guardrails
- **Verified-only contact.** A user must never be able to see, search for, or send a message to a company (or any of its employees) that has not been verified and activated by a Platform Administrator. A leak here destroys the whole product premise.
- **Chat history outlives the individual.** When a Company Owner deactivates an Employee, the chat history that Employee produced on behalf of the company remains accessible to the Company Owner. Loss of that history is a regression even if everything else works.

## Timeline acknowledgment

The user has not committed to a hard deadline or a fixed week count for the MVP. The MVP scope (verified directory + search/filter + company & employee profiles + 1:1 messenger with PDF attachments up to 10 MB + favorites) is explicitly NOT being reduced. The user accepts that this scope, built as after-hours work, requires sustained dedication over a multi-month period. Acknowledged on 2026-05-19: open-ended timeline accepted; scope-cost surfaced and accepted by user. The raw-idea document mentions 3–4 months as a rough self-estimate; this number is treated as a planning hint, not as a `timeline_budget.mvp_weeks` commitment.

## Functional Requirements

### Onboarding & verification

- FR-001: Platform Administrator can send an email invitation to a prospective Company Owner with a unique, single-use sign-up link. Priority: must-have
  > Socrates: Counter-argument considered: "single-use signup links can be lost / forwarded, locking out real Owners." Resolution: stands; Platform Administrator can re-issue an invitation on request. Single-use is the right default for an invite-only product.
- FR-002: Prospective Company Owner can complete sign-up via the invitation link (set credentials, accept terms, confirm contact details). Priority: must-have
  > Socrates: Counter-argument considered: "terms acceptance is a usability tax." Resolution: stands; the terms carry the corporate-chat-ownership rule (load-bearing for FR-023) and the contact-detail consent (load-bearing for FR-010a). Cannot be cut.
- FR-003: Company Owner can submit company-level data for verification (legal name, NIP, KRS, registered address, website, primary contact). Priority: must-have
  > Socrates: Counter-argument considered: "asking for both NIP and KRS is redundant — KRS already implies NIP." Resolution: stands; sole proprietorships have NIP without KRS, so both fields exist; KRS is optional when legally inapplicable.
- FR-004: Platform Administrator can review a pending verification request, mark NIP and KRS as checked, apply industry-fit judgment, and either activate or reject the company. Priority: must-have
  > Socrates: Counter-argument considered: "manual verification doesn't scale past ~200 companies." Resolution: stands for MVP and explicit early adopter phases; the moat *is* the manual touch. Scale-out (semi-automated registry checks, vouching) is a deliberate v2 problem captured in Open Questions.
- FR-005: Company Owner is notified by email when their company is activated, and can then access the full polyGo product. Priority: must-have
  > Socrates: Counter-argument considered: "activation email contradicts the 'no email' notification stance in FR-019." Resolution: transactional activation email is not a chat-replacement notification; it's a one-time access-granted signal. Different category, stands.

### Company & employee profiles

- FR-006: Company Owner can edit the company profile fields (legal name, NIP, KRS, address, website, materials handled, activity type, location). Priority: must-have
  > Socrates: Counter-argument considered: "letting Owners edit NIP/KRS post-verification could let a verified shell company swap to a different legal identity." Resolution: editing NIP/KRS post-verification triggers re-verification (company moves back to `pending` state); other fields are freely editable. Captured as a sub-rule in `## Business Logic`.
- FR-007: Company Owner can pick the materials handled by the company from a polyGo-curated polymer catalog (dropdown of canonical polymer codes — e.g. PE, PP, PVC, PET, PS, ABS, …). Priority: must-have
- FR-007a: Company Owner can propose a new polymer/material to add to the catalog; until a Platform Administrator approves it, the proposed material is visible only on the Owner's own company profile, and after approval it becomes globally selectable and filterable. Priority: must-have
  > Socrates: Counter-argument considered: "open free-text tags cause search fragmentation (PE / PE-LD / LDPE all distinct)." Resolution: changed taxonomy to curated dropdown + propose-new-and-approve flow. Search stays precise; growth path is owner-driven but moderator-approved.
- FR-008: Company Owner can invite Employees by email with single-use sign-up links scoped to that company. Priority: must-have
  > Socrates: Counter-argument considered: "Owner-invited Employees inherit company verification, so the platform shifts trust risk onto each Owner." Resolution: stands; the design intent is exactly that — the Owner vouches for their employees, polyGo vouches for the Owner. Anti-pattern (mass-inviting strangers) is mitigated by per-Owner Employee count being visible to the Platform Administrator.
- FR-009: Employee can complete sign-up via the invitation link and set their personal profile (first name, last name, job title, phone). Priority: must-have
  > Socrates: Counter-argument considered: "phone field is mandatory but FR-010a only reveals it after a chat — why collect it if it isn't shown up-front?" Resolution: phone is collected because counterparties WILL eventually see it (FR-010a) and because it's the call-back path for B2B trade. Required field at signup; gated reveal in product UI.
- FR-010: Employee can view another verified company's full profile, including its list of Employees showing first name, last name, and job title. Phone number is NOT shown in the list view. Priority: must-have
- FR-010a: Phone number of a counterparty Employee becomes visible to an Employee only after a 1:1 chat has been opened with that specific counterparty Employee. Every phone-reveal event is logged for anti-harvest audit. Priority: must-have
  > Socrates: Counter-argument considered: "exposing phone numbers to the whole verified network risks polyGo becoming a phone-number harvester and breaches Employee privacy expectations." Resolution: phone is gated behind 'started conversation' — forces the contact through polyGo (better audit + product loop) and removes the bulk-harvest surface.

### Search & discovery

- FR-011: Employee can search the directory of verified companies, filtering by location (voivodeship / województwo), by activity type (e.g. manufacturer, recycler, supplier, machinery vendor), and by material (one or more canonical polymers picked from the curated catalog per FR-007). Priority: must-have
  > Socrates: Counter-argument considered: "voivodeship-only location filter is too coarse for big trades where distance matters." Resolution: stands for MVP — 16 voivodeships is enough for first useful discovery; city-level radius search is a v2 capability captured in Open Questions.
- FR-012: Search results are sorted by most-recent platform activity first, then alphabetically by company name as a tiebreaker. Priority: must-have
  > Socrates: Counter-argument considered: "ranking by recent activity could bury legitimate but quiet companies that just don't chat much." Resolution: stands; activity is also a responsiveness proxy that buyers genuinely care about. Quiet-but-legitimate firms surface via the alphabetical tiebreaker and via the favorites list.
- FR-013: Employee never sees, in any search result or directory view, a company that is not currently in the `activated` state. Priority: must-have
  > Socrates: Counter-argument considered: "showing 'pending' companies could improve perceived directory density." Resolution: stands — this is the load-bearing guardrail; perceived density is not worth the trust-leak.

### Messenger

- FR-014: Employee can open a 1:1 chat with another Employee from a verified counterparty company by clicking that Employee from the counterparty's company profile. Priority: must-have
  > Socrates: Counter-argument considered: "1:1-only excludes the natural B2B pattern of buyer + seller + sales-engineer multi-party threads." Resolution: stands; group chat is a deliberate v2 cut in `## Non-Goals`. 1:1 is sufficient to prove the value loop.
- FR-015: Employee can send and receive text messages inside an existing chat. Priority: must-have
  > Socrates: Counter-argument considered: "text-only messaging is below WhatsApp baseline (no voice notes, no images, no emoji?)." Resolution: stands; emoji is allowed (Unicode passthrough), images are bundled into "PDF attachments" as v2 (`## Non-Goals`); voice notes are explicitly out.
- FR-016: Employee can attach a PDF file up to 10 MB to a chat message. Priority: must-have
  > Socrates: Counter-argument considered: "10 MB is too small for industrial spec sheets; 50 MB+ is common in machinery vendor quotes." Resolution: stands for MVP; the 10 MB number comes from the raw notes and represents the most common offer/spec PDF size. Larger-file capability is an Open Question to revisit with early adopters.
- FR-017: Employee can see a read-receipt indicator showing when the other party has read a message. Priority: must-have
  > Socrates: Counter-argument considered: "read receipts create social pressure ('why didn't you respond?') that some B2B users prefer to avoid." Resolution: stands but flagged — if early adopters complain, can be made per-user toggleable in v2. Recorded in Open Questions.
- FR-018: Employee sees an in-app notification badge on the messenger surface when one or more chats have unread messages. Priority: must-have
  > Socrates: Counter-argument considered: "badge alone is insufficient when the tab is closed (FR-019 already addresses this)." Resolution: stands; badge is the in-app surface, push is the out-of-tab surface. Complementary.
- FR-019: Employee receives a browser push notification when a new message arrives in any of their chats, provided they have granted browser-push permission and are not currently active on the polyGo tab. Email notifications are explicitly OUT of MVP scope to keep the conversation inside polyGo. Priority: must-have
  > Socrates: Counter-argument considered: "no email = users don't come back; in-app + push only is too low-friction." Resolution: user chose to double-down on the in-app stickiness story. If 30-day-active drops below the 60% guardrail in early-adopter feedback, revisit email notifications then.

### Favorites

- FR-020: Employee can star (and un-star) a counterparty company, adding it to a per-Employee "Favorites" list. Priority: must-have
  > Socrates: Counter-argument considered: "favorites should be company-scoped not employee-scoped — the buyer relationship belongs to the firm, not the individual." Resolution: stands; per-employee favorites match how individual buyers think; the chat-history-retention story (FR-023) already preserves the firm-level record. Keep individual favorites.
- FR-021: Employee can open the Favorites list and from there jump directly into the company profile of a starred counterparty. Priority: must-have
  > Socrates: Counter-argument considered: "Favorites list is a thin feature if the search is already fast." Resolution: stands — favorites also serve as a stable mental anchor in a directory that can otherwise shift order under the activity-based sort (FR-012).

### Offboarding & history retention

- FR-022: Company Owner can deactivate an Employee's account, which immediately blocks that Employee from logging in. Priority: must-have
- FR-023: Company Owner can read the full chat history produced by any current or former Employee of the company. Priority: must-have
  > Socrates: Counter-argument considered: "Owner reading deactivated Employee chats raises personal-privacy concerns under EU law." Resolution: this is a company account, not a personal chat — all conversations are owned by the company. The T&Cs at Employee onboarding (FR-009-extension) state explicitly that chats produced under the company's polyGo account are corporate property and the Owner has access. No half-measure.
- FR-024: Platform Administrator can lock a company or an individual Employee account out-of-band for compliance / safety reasons. Priority: must-have
  > Socrates: Counter-argument considered: "platform-level lockout is a power that could be abused or misapplied." Resolution: stands; the moat depends on it. Lockout actions are logged with timestamp + acting administrator identity, and the impacted Owner is notified.

## Business Logic

**polyGo only lets a user see, search for, or contact another company once both their own company and the counterparty company have passed manual verification by the polyGo team.**

The rule consumes two user-facing inputs to make this decision: the state of the searching Employee's company (must be `activated`) and the state of any company that could appear in the search result, on a profile page, or as a chat target (must be `activated`). The output is binary at every product surface — either the counterparty is visible and contactable, or it does not appear at all. The Employee encounters this rule continuously: in the directory (only activated companies are listed), on every company profile they reach by URL (a non-activated profile renders as "not found"), in the chat inbox (a chat with a counterparty whose company is later locked closes from their side), and in invitations (an invitation cannot be accepted if the inviting company has been deactivated since issuance).

A second rule layered on top governs identity continuity: post-activation edits to a company's legal identity (NIP or KRS) reset its state to `pending` and trigger re-verification by the Platform Administrator before the company is visible again. Other profile edits (address change, adding materials, employee changes) do not trigger re-verification.

The detailed state machine governing verification transitions (`invited → pending → activated → suspended | locked`) is intentionally not captured here — it is an implementation-level concern for the downstream design phase. What matters at PRD level is the gating rule above and the second-layer identity-continuity rule.

## Non-Functional Requirements

- The product interface is presented in Polish throughout, with no English-language fallback on user-facing surfaces. Administrative back-office surfaces may be English-only.
- A logged-in Employee can reach any of the four core product capabilities — searching the directory, opening a counterparty company profile, sending a message in an existing chat, marking or visiting a favorite — within three clicks from a stable home view.
- Personal data and business correspondence stored in polyGo are handled in conformance with EU and Polish data-protection law, including a documented retention policy, a documented deletion-on-request process, and a record-of-processing the polyGo team can produce on demand.
- When two Employees are simultaneously online in their chat, a message sent by one appears on the other's screen within two seconds of the send action under typical network conditions.
- The product remains usable on the latest two major versions of the four mainstream desktop browsers.

## Product framing (for PRD frontmatter)

- `product_type`: web-app — a browser-only web application; no native mobile or desktop client at MVP.
- `target_scale.users`: medium — the MVP must comfortably support the launch cohort of up to ~100 verified companies and their employees. The mature-state ceiling (the full Polish plastics network) is acknowledged as larger and is recorded in `## Open Questions` as a downstream stack-planning input, not an MVP requirement.
- `timeline_budget.mvp_weeks`: null (no fixed week budget; sustained-effort cost surfaced and accepted — see "Timeline acknowledgment" above)
- `timeline_budget.hard_deadline`: null (no calendar deadline)
- `timeline_budget.after_hours_only`: true (built as a side-project around other work)

## Non-Goals

- **No marketplace / classified-ads board.** polyGo deliberately does not build a "kupię / sprzedam" bulletin surface. Discovery happens through the verified directory + chat, not through public listings.
- **No group chat in MVP.** Conversations are strictly 1:1 between two Employees. Multi-party threads (buyer + seller + sales-engineer, etc.) are out of MVP scope.
- **No in-platform payments or invoicing.** polyGo does not move money. Counterparties settle outside the platform.
- **No native mobile app at MVP.** Browser-only. iOS/Android clients arrive only if post-launch user feedback demands them.
- **No public sign-up.** polyGo is invitation-only at MVP and is intended to remain invitation-only post-MVP as well; opening the gates would dilute the verification moat that is the whole product premise.
- **No voice or video calls.** Real-time audio/video is out of MVP scope.
- **No image attachments.** MVP chat accepts text and PDF (≤ 10 MB) only. Image attachments may be revisited based on early-adopter feedback.
- **No public, non-logged-in company profile pages and no SEO indexing.** A non-authenticated visitor with a profile URL sees nothing; company names are not indexable by external search engines.

## Forward: tech-stack

(Informational notes for the downstream tech-stack-selector step — not part of the PRD.)

- The product is a web app; the stack should be optimized for a single-codebase browser SPA / SSR hybrid that one developer can maintain after-hours.
- Polish UI is mandatory at MVP; the chosen i18n approach should be lightweight (single locale, no English fallback for end-user surfaces).
- Real-time messaging with sub-2-second delivery is a chat requirement (FR-014–FR-019); WebSocket / SSE-class infrastructure is implied but not chosen here.
- PDF uploads ≤ 10 MB per file imply object storage with simple lifecycle and quota management; the choice is downstream.
- RODO / GDPR-binding data handling means hosting region and data-processor agreements need to be decided when the stack is picked.
- Browser-push notifications (FR-019) require a PWA-capable hosting target and a push delivery service.
- Mature-state scale (full Polish plastics network) is larger than the MVP `medium` bucket; downstream stack-selection should pick technologies that can scale from medium to large without rewrite.

## Forward: technical-roadmap

(Informational notes for the downstream planning step — not part of the PRD.)

- Post-MVP candidate features explicitly flagged by users / Socrates rounds: city-level / radius location filter, larger PDF attachments (> 10 MB), per-user read-receipt opt-out, image attachments, group chats, voice notes, dedicated company-inbox UI, mobile native clients, email notifications as fallback if browser-push under-performs.
- Material-catalog moderation workflow (FR-007a "propose new polymer") needs a documented Platform Administrator process; this is a small operational runbook, not a product feature.

## Open Questions

1. **Mature-state scale (post-MVP).** MVP `target_scale` is `medium` (≤ 100 companies). The realistic mature ceiling of the Polish plastics network is meaningfully larger (low thousands of companies → tens of thousands of users). The stack-selection step needs this as a planning input. — Owner: user. Block: no.
2. **Larger-than-10 MB PDF attachments.** Early adopters in the machinery-vendor segment may submit quotes / spec sheets > 10 MB. Watch in feedback. — Owner: user. Block: no.
3. **Read-receipt opt-out.** If a meaningful share of early adopters dislikes mandatory read receipts, polyGo should add a per-user toggle. — Owner: user. Block: no.
4. **Email notifications as fallback.** The MVP explicitly drops email notifications. If the 30-day-active early-adopter rate falls below the 60% guardrail, revisit. — Owner: user. Block: no.
5. **City-level / radius location filter.** Voivodeship is the MVP location filter; finer-grained location may matter for short-haul logistics-sensitive trades. — Owner: user. Block: no.
6. **Material-catalog moderation runbook.** FR-007a requires a documented Platform Administrator process for approving / rejecting newly proposed polymers. — Owner: user. Block: no.

## Quality cross-check

| Element | Status | Notes |
|---|---|---|
| Access Control | present | 3 roles defined (Platform Administrator, Company Owner, Employee); sign-up, sign-in, lockout, and offboarding rules captured. |
| Business Logic | present | One-sentence gating rule plus secondary identity-continuity rule. Empty-CRUD anti-pattern not triggered: polyGo has a real domain rule (verification gating). |
| Project artifacts | present | `context/foundation/shape-notes.md` with valid frontmatter checkpoint. |
| Timeline-cost acknowledged | present | Open-ended timeline acknowledged on 2026-05-19 under `## Timeline acknowledgment`; scope explicitly NOT cut. |
| Non-Goals | present | 8 explicit non-goals captured covering both functional and non-functional avoids. |

No outstanding gaps. `quality_check_status: accepted`.

## User Stories

### US-01: Trading employee finds and contacts a verified counterparty

- **Given** an Employee at a verified company is logged into polyGo
- **And** there exists at least one other activated company offering the material they are sourcing
- **When** they open the directory, apply a filter on voivodeship + activity type + material tag, open the profile of a matching company, select one of its listed Employees, and click "open chat"
- **Then** a 1:1 chat surface opens between them and the selected counterparty Employee, ready to receive a text message and a PDF attachment, and a notification is queued for the counterparty.

#### Acceptance Criteria
- Filter combinations always return only `activated` companies; an unverified or rejected company is never in the result set.
- The counterparty Employee profile shows at minimum: first name, last name, job title, phone number.
- Opening the chat creates a persistent thread; a second click of the same Employee re-opens the existing thread, not a new one.
- A sent PDF attachment ≤ 10 MB is accepted and visible in the chat; > 10 MB is refused with a clear error.

### US-02: Company Owner retains institutional memory after an employee leaves

- **Given** a Company Owner has at least one current Employee with chat history in polyGo
- **When** that Employee leaves the company and the Owner marks them as deactivated in polyGo
- **Then** the Employee can no longer log in, but the Company Owner can still open the deactivated Employee's chats and read the full message history (text and attachments), preserving the company's commercial record.

#### Acceptance Criteria
- After deactivation, login attempts by the Employee receive a clear "account locked — contact your Company Owner" message and no application access.
- The Owner can see all threads the deactivated Employee participated in, with full message and attachment content, organized by counterparty company.
- The deactivation event is logged with timestamp and acting Owner identity for the company's own compliance record.

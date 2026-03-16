# GEOPOLITICAL COMMAND — Current State & Roadmap

## Current State (v1.0)

### Tech Stack
- Vue 3 + TypeScript (strict) + Vite 8
- Pinia state management (4 stores: game, relationship, coalition, news)
- Tailwind CSS 4 with @theme CSS variables
- Chart.js + vue-chartjs for power history graphs
- Claude API (claude-sonnet-4-5) — direct browser calls, player provides own key
- Deployed on Netlify: https://game-geo-politics.netlify.app

### Core Gameplay (Working)
- **10 playable factions:** USA, China, EU, India, UK, Russia, Middle East, ASEAN, Latin America, African Union
- **Action system:** 8 base actions (Sanctions, Military Posture, Diplomacy, Form Alliance, Trade Deal, Foreign Aid, Intel Op, Info War) + 3 compound actions (Economic Warfare, Strategic Partnership, Shadow War — unlock turn 8)
- **AP economy:** Start 80/turn, recover +35/turn, cap 120. Actions cost 10–30 AP
- **Turn phases:** Tutorial (1–2) → Opening (3–6) → Midgame (7–12) → Endgame (13–18) → Sudden Death (19+)
- **4 stats per faction:** Military, Economy, Diplomacy, Influence (0–100 each). Power = average
- **Difficulty scaling:** Easy to Very Hard per faction
- **Cooldown system:** Per-target and global cooldowns on actions

### AI & Narrative (Working)
- Claude API generates narrative turn resolution as structured JSON
- Includes: headline, narrative, world reaction, stat changes, AI reactions, triggered events, forecast
- Stat deltas bounded by game phase (±4 tutorial → ±12 sudden death)
- Fallback error response on API failure
- Prompt includes compressed world state, recent news, top relationships, active coalitions

### Faction System (Working)
- Unique passive abilities (e.g., USA: +2 ECO per trade deal, Middle East: +2 ECO/turn)
- One-time signature abilities per faction
- Personality traits drive NPC behavior (aggression, diplomacy, economy, coalition-seeking, grudge decay)

### Relationships & Coalitions (Working)
- Relationship scores -100 to +100 per faction pair
- Grudge/gratitude tracking with decay
- Trade deal and betrayal counters
- 4 coalition types (Military, Economic, Diplomatic, Intelligence) with leader, cohesion, proposal workflow

### World Tension (Working)
- Global 0–100 scale with 5 states: Stable → Tense → Crisis → Brink → War
- Aggressive actions raise tension, diplomatic actions lower it
- High tension amplifies military effects (×1.5 at ≥70) and dampens diplomacy (×0.4 at war)
- Event probability scales from 20% (stable) to 85% (war)
- World War threshold at 91+

### Event System (Working)
- 11 event types: nuclear brinkmanship, economic crash, regime change, cyber attack, pandemic, resource crisis, refugee wave, proxy war, space race, climate disaster, cultural revolution
- Tension-weighted trigger probability with min-turn gating
- Cascade relationships defined between event types

### Victory & Loss (Working)
- **5 victory paths:** Domination (raw power), Diplomatic (coalition leadership), Economic (trade empire), Influence (soft power), Underdog (coalition of the weak)
- **3 loss conditions:** Total collapse (all stats <30), Failed state (power <30 for 3+ turns), Catastrophe (tension ≥91 + MIL <40)
- Victory tracker UI with progress indicators

### UI/UX (Working)
- Dark terminal CRT aesthetic (scanline overlay, green terminal text, pixel borders)
- Fonts: IBM Plex Mono (body), Bebas Neue (display)
- Faction select screen with world map preview and 10 faction cards
- 3-panel game board: left (faction list + actions), center (map + power chart), right (tension + victory + news)
- Interactive SVG world map (clickable regions for targeting)
- Stat bars color-coded (MIL=red, ECO=green, DIP=blue, INF=purple)
- Crisis modal, tutorial overlay, API key input modal

---

## Known Issues & Gaps

### Bugs / Inconsistencies
- **Victory logic duplication:** `victoryDetector.ts` checks domination streak ≥3, but `GameOver.vue` checks ≥5 — needs alignment
- **Compound action requirements:** `requirementCheck` callbacks are stubbed (always return true) — noted as "full check in actionResolver"
- **Crisis modal placeholder:** GameBoard has empty crisis data — marked as "in a real game this comes from the narrative engine"

### Incomplete Features
- **Event cascades:** Cascade relationships defined in templates but cascade execution logic not triggered
- **AI coalition proposals:** NPC factions don't propose coalitions autonomously — only player can propose
- **Coalition cohesion impact:** Tracked but doesn't affect betrayal probability or coalition collapse
- **Signature ability activation:** Defined per faction but activation/cooldown logic is sparse
- **Narrative display flow:** API call works but integration between narrative results and UI display could be tighter

### Missing Features
- **No save/load:** All game state is client-side and lost on refresh
- **No sound/music:** Pure visual experience
- **No multiplayer:** Single-player only
- **No replay/history:** Can't review past game decisions
- **No settings:** No volume, speed, or accessibility options

### Technical Debt
- Hardcoded API URL and model name in `narrativeEngine.ts`
- Some hardcoded UI strings (could be extracted to constants)
- No error boundary components
- API key stored in localStorage (acceptable for client-side game, but noted)

---

## Roadmap

### Phase 1: Polish & Fix (Quick Wins)

**Priority: High | Effort: Low**

- [ ] **Fix victory logic inconsistency** — Align GameOver.vue with victoryDetector.ts (single source of truth)
- [ ] **Wire crisis modal** — Connect event system output to crisis modal display with real narrative data
- [ ] **Implement compound action requirements** — Replace stubbed requirementCheck with actual validation (e.g., Strategic Partnership requires DIP ≥ 60)
- [ ] **Add save/load** — Serialize game state to localStorage with save slots (auto-save each turn + manual save)
- [ ] **Extract hardcoded strings** — Move API config, model name, and UI text to constants file
- [ ] **Add loading states** — Show proper loading indicators during Claude API calls (not just "Transmitting...")

### Phase 2: Deepen Gameplay

**Priority: High | Effort: Medium**

- [ ] **Event cascade execution** — When an event triggers, check cascade relationships and queue follow-up events with delay
- [ ] **AI coalition behavior** — Let NPC factions propose coalitions based on shared threats or personality alignment
- [ ] **Coalition mechanics** — Cohesion affects: betrayal chance, joint action bonuses, collapse threshold. Low cohesion → members leave
- [ ] **Signature ability UI** — Dedicated button per faction with cooldown display, dramatic activation animation, and narrative integration
- [ ] **Richer AI decision-making** — Add randomness/personality weighting to NPC decisions, occasional irrational moves, grudge-driven revenge
- [ ] **Crisis decision consequences** — Make crisis choices meaningfully different with lasting stat/relationship effects
- [ ] **Dynamic difficulty** — Rubber-banding: if player is far behind, AI factions turn on each other more; if ahead, they coordinate against player

### Phase 3: Content & Variety

**Priority: Medium | Effort: Medium**

- [ ] **More events** — Add 10-15 new event types: trade war, assassination attempt, UN resolution, technological breakthrough, espionage scandal, border dispute, cultural export, humanitarian crisis
- [ ] **Scenario system** — Pre-built starting conditions (Cold War 2.0, Economic Collapse, Climate Emergency, Pandemic Response) with modified starting stats and tension
- [ ] **Random world modifiers** — Each game gets 2-3 random global rules (e.g., "Oil Shock: all ECO gains halved", "Arms Race: MIL actions cost -5 AP")
- [ ] **Faction-specific events** — Unique events per faction (e.g., USA: government shutdown, China: belt-and-road milestone, EU: Brexit-style exit)
- [ ] **News feed upgrade** — Rich narrative cards with faction portraits, stat change indicators, and relationship shift visualizations
- [ ] **Turn summary screen** — End-of-turn report showing all changes, AI actions, event outcomes in a digestible format

### Phase 4: UI/UX Improvements

**Priority: Medium | Effort: Medium-High**

- [ ] **Improved world map** — Better SVG with recognizable country shapes, zoom/pan, region highlighting on hover, animated conflict zones
- [ ] **Relationship web visualization** — Interactive graph showing all faction relationships (green=allied, red=hostile, thickness=strength)
- [ ] **Timeline view** — Scrollable history of all turns with key events, stat snapshots, and decision points
- [ ] **Mobile responsiveness** — Adapt 3-panel layout for phone/tablet (stacked panels, swipe navigation)
- [ ] **Sound design** — Ambient dark synth, CRT boot-up sound, action confirmation beeps, tension escalation audio cues
- [ ] **Accessibility** — Screen reader support, high-contrast mode, reduced motion option, keyboard navigation
- [ ] **Tooltip system** — Hover tooltips explaining stats, actions, relationships, and game mechanics

### Phase 5: Advanced Features

**Priority: Low | Effort: High**

- [ ] **Multiplayer (async)** — Turn-based multiplayer where each player controls a faction, with AI filling remaining slots. Could use Supabase for state sync
- [ ] **Campaign mode** — Linked scenarios forming a narrative arc (e.g., 5-game campaign from Cold War to Modern Era)
- [ ] **Mod support** — JSON-driven faction/action/event definitions so players can create custom scenarios
- [ ] **Achievements** — Track milestones (first victory, all victory types, survive 30 turns, etc.)
- [ ] **Leaderboard** — Track best scores per faction/difficulty (local or cloud-based)
- [ ] **AI personality evolution** — NPC factions learn from player behavior across turns (e.g., if player always betrays alliances, AI becomes wary)
- [ ] **Economic simulation depth** — GDP model, trade routes, resource dependencies, sanctions cascading through trade networks
- [ ] **Replay system** — Record and replay full games, share game seeds

### Phase 6: Platform & Distribution

**Priority: Low | Effort: High**

- [ ] **Backend API proxy** — Move Claude API calls server-side (Netlify Functions) to hide API key and add response validation
- [ ] **User accounts** — Login to save games across devices, track stats, unlock achievements
- [ ] **PWA support** — Installable app with offline play (pre-generated narrative fallbacks)
- [ ] **Analytics** — Track play patterns, popular factions, average game length, victory path distribution
- [ ] **Localization** — i18n support for UI text and narrative prompts

---

## Architecture Improvements (Cross-Cutting)

These improvements support multiple roadmap phases:

| Improvement | Benefits | Phases |
|---|---|---|
| Single source of truth for victory/loss logic | Eliminates inconsistencies | 1, 2 |
| Event bus or action middleware | Enables cascades, logging, replay | 2, 3, 5 |
| Composable game engine (separate from Vue) | Enables testing, multiplayer, replay | 2, 5 |
| Narrative response caching | Reduces API costs, enables offline | 4, 6 |
| State serialization layer | Enables save/load, multiplayer, replay | 1, 5 |

---

## Metrics to Track

Once analytics are in place, track these to guide priorities:

- **Average game completion rate** — Do players finish games?
- **Most/least chosen factions** — Balance indicator
- **Victory path distribution** — Are all 5 paths viable?
- **Average turns per game** — Is pacing right?
- **Drop-off point** — Where do players quit?
- **Action usage distribution** — Are all actions useful?
- **API error rate** — Narrative reliability

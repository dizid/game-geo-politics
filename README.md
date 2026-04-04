# Geopolitical Command

A turn-based geopolitical strategy game built with Vue 3, TypeScript, and the Claude AI API. Players choose a world faction and compete for global influence through diplomacy, covert operations, coalition building, and economic pressure.

**Live:** https://game-geo-politics.netlify.app

---

## Gameplay

- Choose from 9 factions (USA, China, Russia, EU, UK, India, ASEAN, Middle East, Africa, Latin America)
- Each faction has unique **signature abilities**, **stats**, and **playstyle**
- Take multi-action turns: diplomacy, covert ops, economic actions, coalition management
- React to dynamic **crisis events** and **story threads**
- AI-powered faction behavior via Claude API
- Win by reaching the influence threshold or outlasting all rivals

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3 + TypeScript + Vite 8 |
| State | Pinia |
| Styling | Tailwind CSS 4 (`@theme` vars) |
| Charts | Chart.js + vue-chartjs |
| AI | Anthropic Claude API (claude-sonnet-4-5) |
| Deploy | Netlify |
| Tests | Playwright (E2E) |

---

## Setup

```bash
npm install
npm run dev
```

> The game uses the **Claude API directly from the browser**. Players enter their own Anthropic API key in the settings panel. No backend required.

---

## Project Structure

```
src/
├── components/         # UI components
│   ├── charts/         # Chart.js visualizations
│   ├── coalition/      # Coalition management UI
│   ├── covert/         # Covert ops panel
│   ├── crisis/         # Crisis event display
│   ├── diplomacy/      # Diplomacy panel
│   ├── hud/            # Heads-up display / status bars
│   ├── map/            # World map component
│   ├── narrative/      # Story/narrative display
│   ├── panels/         # Side panels (actions, info)
│   ├── settings/       # API key + game settings
│   └── tutorial/       # Tutorial overlay
├── data/               # Static game data
│   ├── factions.ts     # Faction definitions + stats
│   ├── actions.ts      # Available player actions
│   ├── agendas.ts      # Faction agendas
│   ├── covertOps.ts    # Covert operation types
│   ├── events.ts       # Crisis/random event pool
│   ├── mapRegions.ts   # Map region definitions
│   ├── turnModifiers.ts# Turn modifier effects
│   └── diplomacy.ts    # Diplomacy action data
├── engine/             # Core game logic
│   ├── ai/             # Claude AI integration
│   │   ├── coalitionAI.ts
│   │   ├── decisionEngine.ts
│   │   └── factionArchetypes.ts
│   ├── balance/        # Game balance calculations
│   ├── events/         # Event processing
│   ├── narrative/      # Story thread engine
│   └── persistence/    # Save/load game state
├── stores/             # Pinia state stores
│   ├── gameStore.ts    # Core game state + turn logic
│   ├── agendaStore.ts  # Faction agendas
│   ├── coalitionStore.ts
│   ├── covertStore.ts
│   ├── diplomacyStore.ts
│   ├── eventStore.ts
│   ├── newsStore.ts
│   ├── relationshipStore.ts
│   └── storyStore.ts
├── types/              # TypeScript type definitions
│   ├── game.ts
│   └── diplomacy.ts
└── views/              # Route-level views
    ├── FactionSelect.vue
    ├── GameBoard.vue
    └── GameOver.vue
```

---

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Type-check + production build
npm run preview    # Preview production build
```

---

## E2E Tests

Playwright tests live in `tests/e2e/`. Screenshots are committed alongside tests as visual regression references.

```bash
npx playwright test
```

---

## Deployment

Hosted on Netlify. Auto-deploys from `main` branch.

- **Site:** game-geo-politics
- **URL:** https://game-geo-politics.netlify.app
- **Site ID:** `14228bfd-1cc5-4ce0-8404-30ee8082d1be`

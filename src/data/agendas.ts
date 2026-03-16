// ─── Faction Agendas ──────────────────────────────────────────────────────────
// Each AI faction pursues a multi-turn strategic objective.

export interface AgendaTemplate {
  id: string
  factionId: string
  name: string
  description: string
  targetStat: 'mil' | 'eco' | 'dip' | 'inf'
  targetValue: number
  milestones: { threshold: number; narrative: string }[]
}

export const AGENDA_TEMPLATES: AgendaTemplate[] = [
  // ── USA ──
  { id: 'usa_global_order', factionId: 'usa', name: 'Global Order', description: 'Maintain military supremacy worldwide', targetStat: 'mil', targetValue: 95,
    milestones: [{ threshold: 33, narrative: 'USA expands military bases in key regions' }, { threshold: 66, narrative: 'USA achieves naval dominance in the Pacific' }, { threshold: 90, narrative: 'USA deploys next-generation weapons systems globally' }] },
  { id: 'usa_tech_supremacy', factionId: 'usa', name: 'Tech Supremacy', description: 'Dominate global tech and AI development', targetStat: 'inf', targetValue: 95,
    milestones: [{ threshold: 33, narrative: 'USA restricts tech exports to rivals' }, { threshold: 66, narrative: 'US tech firms absorb key competitors' }, { threshold: 90, narrative: 'USA controls critical AI infrastructure' }] },
  { id: 'usa_dollar_hegemony', factionId: 'usa', name: 'Dollar Hegemony', description: 'Maintain the dollar as world reserve currency', targetStat: 'eco', targetValue: 95,
    milestones: [{ threshold: 33, narrative: 'USA strengthens trade ties with allies' }, { threshold: 66, narrative: 'Dollar usage in trade increases sharply' }, { threshold: 90, narrative: 'Alternative currencies lose credibility' }] },

  // ── China ──
  { id: 'china_belt_road', factionId: 'china', name: 'Belt & Road', description: 'Build economic dominance through infrastructure', targetStat: 'eco', targetValue: 95,
    milestones: [{ threshold: 33, narrative: 'China completes major port investments in Africa' }, { threshold: 66, narrative: 'Belt & Road network spans three continents' }, { threshold: 90, narrative: 'China becomes the world\'s largest creditor' }] },
  { id: 'china_digital_silk', factionId: 'china', name: 'Digital Silk Road', description: 'Control global digital infrastructure', targetStat: 'inf', targetValue: 90,
    milestones: [{ threshold: 33, narrative: 'China deploys 5G networks across Asia' }, { threshold: 66, narrative: 'Chinese social platforms dominate emerging markets' }, { threshold: 90, narrative: 'China controls majority of undersea cable routes' }] },
  { id: 'china_reunification', factionId: 'china', name: 'Reunification', description: 'Achieve military parity and project power', targetStat: 'mil', targetValue: 90,
    milestones: [{ threshold: 33, narrative: 'China launches new aircraft carriers' }, { threshold: 66, narrative: 'PLA achieves regional military superiority' }, { threshold: 90, narrative: 'China\'s military spending surpasses all rivals' }] },

  // ── EU ──
  { id: 'eu_strategic_autonomy', factionId: 'eu', name: 'Strategic Autonomy', description: 'Build independent European defense capability', targetStat: 'mil', targetValue: 80,
    milestones: [{ threshold: 33, narrative: 'EU agrees on joint defense procurement' }, { threshold: 66, narrative: 'European rapid reaction force achieves operational status' }, { threshold: 90, narrative: 'EU establishes independent defense command' }] },
  { id: 'eu_green_deal', factionId: 'eu', name: 'Green New Deal', description: 'Lead the global energy transition', targetStat: 'eco', targetValue: 90,
    milestones: [{ threshold: 33, narrative: 'EU carbon border tax takes effect' }, { threshold: 66, narrative: 'Renewable energy exceeds 80% of EU grid' }, { threshold: 90, narrative: 'EU becomes world leader in clean technology' }] },
  { id: 'eu_enlargement', factionId: 'eu', name: 'Enlargement', description: 'Expand the European project diplomatically', targetStat: 'dip', targetValue: 92,
    milestones: [{ threshold: 33, narrative: 'EU opens accession talks with new candidates' }, { threshold: 66, narrative: 'New members join the European bloc' }, { threshold: 90, narrative: 'EU becomes the world\'s largest diplomatic bloc' }] },

  // ── Russia ──
  { id: 'russia_energy_monopoly', factionId: 'russia', name: 'Energy Monopoly', description: 'Control global energy supply chains', targetStat: 'eco', targetValue: 80,
    milestones: [{ threshold: 33, narrative: 'Russia secures new energy contracts in Asia' }, { threshold: 66, narrative: 'Russian gas dominates European markets' }, { threshold: 90, narrative: 'Russia controls critical energy chokepoints' }] },
  { id: 'russia_near_abroad', factionId: 'russia', name: 'Near Abroad', description: 'Reassert influence in neighboring states', targetStat: 'dip', targetValue: 75,
    milestones: [{ threshold: 33, narrative: 'Russia pressures border states diplomatically' }, { threshold: 66, narrative: 'Multiple neighbors align with Moscow' }, { threshold: 90, narrative: 'Russia dominates regional security architecture' }] },
  { id: 'russia_arctic_dom', factionId: 'russia', name: 'Arctic Dominance', description: 'Secure military control of the Arctic', targetStat: 'mil', targetValue: 88,
    milestones: [{ threshold: 33, narrative: 'Russia expands Arctic military bases' }, { threshold: 66, narrative: 'Northern Sea Route secured by Russian navy' }, { threshold: 90, narrative: 'Russia claims exclusive Arctic resource rights' }] },

  // ── India ──
  { id: 'india_digital_india', factionId: 'india', name: 'Digital India', description: 'Become a global tech and services hub', targetStat: 'inf', targetValue: 82,
    milestones: [{ threshold: 33, narrative: 'India expands IT sector investment' }, { threshold: 66, narrative: 'Indian tech firms compete globally' }, { threshold: 90, narrative: 'India becomes the world\'s digital services hub' }] },
  { id: 'india_make_in_india', factionId: 'india', name: 'Make in India', description: 'Build manufacturing independence', targetStat: 'eco', targetValue: 85,
    milestones: [{ threshold: 33, narrative: 'India attracts major manufacturing investment' }, { threshold: 66, narrative: 'Indian manufacturing rivals Chinese output' }, { threshold: 90, narrative: 'India becomes a top-3 manufacturing economy' }] },
  { id: 'india_blue_water', factionId: 'india', name: 'Blue Water Navy', description: 'Project naval power across the Indian Ocean', targetStat: 'mil', targetValue: 82,
    milestones: [{ threshold: 33, narrative: 'India commissions new naval vessels' }, { threshold: 66, narrative: 'Indian navy patrols extend to the Persian Gulf' }, { threshold: 90, narrative: 'India achieves Indian Ocean naval dominance' }] },

  // ── UK ──
  { id: 'uk_global_britain', factionId: 'uk', name: 'Global Britain', description: 'Expand diplomatic reach beyond Europe', targetStat: 'dip', targetValue: 85,
    milestones: [{ threshold: 33, narrative: 'UK signs new trade deals with Pacific nations' }, { threshold: 66, narrative: 'UK joins major Pacific trade bloc' }, { threshold: 90, narrative: 'UK becomes a key diplomatic bridge between regions' }] },
  { id: 'uk_five_eyes', factionId: 'uk', name: 'Five Eyes+', description: 'Expand intelligence-sharing alliances', targetStat: 'inf', targetValue: 80,
    milestones: [{ threshold: 33, narrative: 'UK enhances intelligence sharing with allies' }, { threshold: 66, narrative: 'Five Eyes expands to new partner nations' }, { threshold: 90, narrative: 'UK-led intelligence network becomes the world\'s most extensive' }] },

  // ── Middle East ──
  { id: 'me_opec_plus', factionId: 'middleeast', name: 'OPEC+ Dominance', description: 'Control global oil prices and supply', targetStat: 'eco', targetValue: 85,
    milestones: [{ threshold: 33, narrative: 'OPEC+ tightens production quotas' }, { threshold: 66, narrative: 'Oil prices rise under OPEC+ control' }, { threshold: 90, narrative: 'OPEC+ achieves unprecedented market control' }] },
  { id: 'me_vision_2030', factionId: 'middleeast', name: 'Vision 2030', description: 'Diversify economy beyond oil', targetStat: 'inf', targetValue: 75,
    milestones: [{ threshold: 33, narrative: 'Major tech and tourism investments launched' }, { threshold: 66, narrative: 'Non-oil economy surpasses 50% of GDP' }, { threshold: 90, narrative: 'Middle East becomes a global innovation hub' }] },

  // ── ASEAN ──
  { id: 'asean_centrality', factionId: 'asean', name: 'ASEAN Centrality', description: 'Become the diplomatic center of the Indo-Pacific', targetStat: 'dip', targetValue: 80,
    milestones: [{ threshold: 33, narrative: 'ASEAN hosts major multilateral summit' }, { threshold: 66, narrative: 'ASEAN mediates a regional dispute successfully' }, { threshold: 90, narrative: 'ASEAN becomes the primary diplomatic forum for Asia' }] },
  { id: 'asean_tiger', factionId: 'asean', name: 'Tiger Economies', description: 'Rapid economic growth across the region', targetStat: 'eco', targetValue: 82,
    milestones: [{ threshold: 33, narrative: 'ASEAN trade volume grows rapidly' }, { threshold: 66, narrative: 'Multiple ASEAN nations reach upper-middle income status' }, { threshold: 90, narrative: 'ASEAN becomes the world\'s fastest-growing economic region' }] },

  // ── Latin America ──
  { id: 'latam_integration', factionId: 'latam', name: 'Continental Integration', description: 'Build a unified Latin American bloc', targetStat: 'dip', targetValue: 78,
    milestones: [{ threshold: 33, narrative: 'Latin American nations agree on customs union' }, { threshold: 66, narrative: 'Continental development bank reaches full operation' }, { threshold: 90, narrative: 'Latin America speaks with one voice in global forums' }] },
  { id: 'latam_commodity', factionId: 'latam', name: 'Commodity Power', description: 'Leverage natural resource wealth', targetStat: 'eco', targetValue: 75,
    milestones: [{ threshold: 33, narrative: 'Latin America forms commodity exporters alliance' }, { threshold: 66, narrative: 'Lithium and rare earths give Latin America leverage' }, { threshold: 90, narrative: 'Latin America controls key global supply chains' }] },

  // ── Africa ──
  { id: 'africa_afcfta', factionId: 'africa', name: 'African Free Trade', description: 'Build continental free trade area', targetStat: 'eco', targetValue: 70,
    milestones: [{ threshold: 33, narrative: 'AfCFTA implementation accelerates' }, { threshold: 66, narrative: 'Intra-African trade doubles' }, { threshold: 90, narrative: 'Africa becomes the world\'s largest free trade zone' }] },
  { id: 'africa_renaissance', factionId: 'africa', name: 'African Renaissance', description: 'Become a major global diplomatic voice', targetStat: 'dip', targetValue: 72,
    milestones: [{ threshold: 33, narrative: 'African Union gains observer status at G7' }, { threshold: 66, narrative: 'Africa secures permanent UNSC seat' }, { threshold: 90, narrative: 'Africa reshapes global governance institutions' }] },
  { id: 'africa_youth_dividend', factionId: 'africa', name: 'Youth Dividend', description: 'Harness demographic growth for development', targetStat: 'inf', targetValue: 68,
    milestones: [{ threshold: 33, narrative: 'African tech hubs attract global investment' }, { threshold: 66, narrative: 'African innovation centers compete globally' }, { threshold: 90, narrative: 'Africa leads in youth-driven digital economy' }] },
]

/** Get random agenda for a faction */
export function getRandomAgenda(factionId: string): AgendaTemplate | null {
  const options = AGENDA_TEMPLATES.filter(a => a.factionId === factionId)
  if (options.length === 0) return null
  return options[Math.floor(Math.random() * options.length)]
}

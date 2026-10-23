import { search, insights, type QlooEntity } from "./qloo";

export type Pick = {
  id: string;
  name: string;
  affinity: number; // 0..1 how strongly the audience over-indexes
  popularity: number; // 0..1 how famous (high = obvious booking)
  gemScore: number; // affinity * (1 - popularity): high-fit but under-the-radar
  isHiddenGem: boolean;
  image?: string;
  genres: string[];
  drivenBy: { name: string; score: number }[]; // which headliner(s) pulled this pick in
};

export type LineupResult = {
  headliners: { id: string; name: string; popularity: number }[];
  city?: string;
  lineup: Pick[];
  unresolved: string[]; // names Qloo couldn't match
};

// The undercard band: Qloo's most-affine neighbors of famous headliners are themselves
// famous (pop ~1.0) — useless as bookings. Capping popularity surfaces high-affinity acts
// the crowd will love but that you'd never think to book. This band IS the product.
// ponytail: band + gem threshold are tunable knobs — the demo can dial "how obscure".
const DEFAULT_POP_MIN = 0.2; // floor out noise / non-bookable unknowns
const DEFAULT_POP_MAX = 0.8; // ceiling out the already-famous
const GEM_POPULARITY = 0.45; // below this = a genuine deep-cut discovery

export async function buildLineup(
  names: string[],
  city?: string,
  band: { min?: number; max?: number } = {},
): Promise<LineupResult> {
  const resolved = await Promise.all(names.map((n) => search(n)));
  const headliners = resolved.filter((r): r is QlooEntity => !!r);
  const unresolved = names.filter((_, i) => !resolved[i]);
  if (!headliners.length) return { headliners: [], city, lineup: [], unresolved };

  const idToName = new Map(headliners.map((h) => [h.entity_id, h.name]));
  const headlinerIds = new Set(headliners.map((h) => h.entity_id));

  const data = await insights({
    filterType: "urn:entity:artist",
    signalEntities: headliners.map((h) => h.entity_id),
    explainability: true,
    popularityMin: band.min ?? DEFAULT_POP_MIN,
    popularityMax: band.max ?? DEFAULT_POP_MAX,
    take: 25,
  });
  const ents = data.results?.entities ?? [];

  const lineup: Pick[] = ents
    // drop the headliners themselves + junk entries (names with no letters/digits)
    .filter((e) => !headlinerIds.has(e.entity_id) && /[a-z0-9]/i.test(e.name ?? ""))
    .map((e) => {
      const affinity = e.query?.affinity ?? 0;
      const popularity = e.popularity ?? 0;
      const attr = e.query?.explainability?.["signal.interests.entities"] ?? [];
      return {
        id: e.entity_id,
        name: e.name,
        affinity,
        popularity,
        gemScore: affinity * (1 - popularity),
        isHiddenGem: popularity <= GEM_POPULARITY,
        image: e.properties?.image?.url,
        genres: (e.tags ?? []).filter((t) => t.type?.includes("genre")).map((t) => t.name).slice(0, 3),
        drivenBy: attr.map((a) => ({ name: idToName.get(a.entity_id) ?? a.entity_id, score: a.score })),
      };
    })
    .sort((a, b) => b.gemScore - a.gemScore)
    .slice(0, 12);

  return {
    headliners: headliners.map((h) => ({ id: h.entity_id, name: h.name, popularity: h.popularity ?? 0 })),
    city,
    lineup,
    unresolved,
  };
}

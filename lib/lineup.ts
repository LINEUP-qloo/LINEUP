import { search, insights, type QlooEntity } from "./qloo";

type Attr = { name: string; score: number };
type Lane = { results?: { entities?: QlooEntity[]; demographics?: unknown[] } };

export type TraceStep = { step: string; label: string; ms: number; count: number };

export type Pick = {
  id: string;
  name: string;
  affinity: number; // 0..1 how strongly the audience over-indexes
  popularity: number; // 0..1 how famous (high = obvious booking)
  gemScore: number; // affinity * (1 - popularity): high-fit but under-the-radar
  isHiddenGem: boolean;
  image?: string;
  genres: string[];
  drivenBy: Attr[]; // which headliner(s) pulled this pick in
};

export type Sponsor = {
  id: string;
  name: string;
  affinity: number;
  popularity: number;
  image?: string;
  drivenBy: Attr[];
};

export type Place = {
  id: string;
  name: string;
  affinity: number;
  popularity: number;
  address?: string;
  goodFor: string[];
  image?: string;
};

export type AudienceRead = {
  age: { bracket: string; score: number }[]; // signed over/under-index, averaged across headliners
  gender: { male: number; female: number };
};

export type LineupResult = {
  trace: TraceStep[];
  headliners: { id: string; name: string; popularity: number }[];
  city?: string; // primary city (first stop) — for narrate/export back-compat
  lineup: Pick[];
  sponsors: Sponsor[];
  places: Place[]; // primary city's partners
  tour: { city: string; places: Place[] }[]; // one entry per tour stop (only the venue lane varies by city)
  audience: AudienceRead | null;
  unresolved: string[]; // names Qloo couldn't match
};

// The undercard band: Qloo's most-affine neighbors of famous headliners are themselves
// famous (pop ~1.0) — useless as bookings. Capping popularity surfaces high-affinity acts
// the crowd will love but that you'd never think to book. This band IS the product.
// ponytail: bands + gem threshold are tunable knobs — the demo can dial "how obscure".
const DEFAULT_POP_MIN = 0.2;
const DEFAULT_POP_MAX = 0.8;
const GEM_POPULARITY = 0.45; // below this = a genuine deep-cut discovery
const PLACE_POP_MAX = 0.85; // lean toward local spots over national landmarks
const AGE_ORDER = ["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"];

const named = (e: QlooEntity) => /[a-z0-9]/i.test(e.name ?? ""); // drop junk (non-alphanumeric) names
const attribution = (e: QlooEntity, idToName: Map<string, string>): Attr[] =>
  (e.query?.explainability?.["signal.interests.entities"] ?? []).map((a) => ({
    name: idToName.get(a.entity_id) ?? a.entity_id,
    score: a.score,
  }));
const imageOf = (e: QlooEntity): string | undefined => {
  const p = e.properties as { image?: { url?: string }; images?: { url?: string }[] } | undefined;
  return p?.image?.url ?? p?.images?.[0]?.url;
};

const toPlaces = (data: Lane): Place[] =>
  (data.results?.entities ?? [])
    .filter(named)
    .map((e) => {
      const p = e.properties as { address?: string; good_for?: unknown[] } | undefined;
      const goodFor = Array.isArray(p?.good_for)
        ? p!.good_for.map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name)).filter((s): s is string => !!s).slice(0, 4)
        : [];
      return { id: e.entity_id, name: e.name, affinity: e.query?.affinity ?? 0, popularity: e.popularity ?? 0, address: p?.address, goodFor, image: imageOf(e) };
    })
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, 8);

export async function buildLineup(
  names: string[],
  cities: string[] = [],
  band: { min?: number; max?: number } = {},
): Promise<LineupResult> {
  const cityList = cities.map((c) => c.trim()).filter(Boolean);
  const city = cityList[0];
  const trace: TraceStep[] = [];
  const t0 = Date.now();
  const resolved = await Promise.all(names.map((n) => search(n)));
  const headliners = resolved.filter((r): r is QlooEntity => !!r);
  const unresolved = names.filter((_, i) => !resolved[i]);
  trace.push({ step: "search", label: `Resolve headliners · /search`, ms: Date.now() - t0, count: headliners.length });

  if (!headliners.length)
    return { trace, city, unresolved, headliners: [], lineup: [], sponsors: [], places: [], tour: [], audience: null };

  const idToName = new Map(headliners.map((h) => [h.entity_id, h.name]));
  const headlinerIds = new Set(headliners.map((h) => h.entity_id));
  const signal = headliners.map((h) => h.entity_id);

  // Time each lane individually even though they run concurrently.
  const timed = async (step: string, label: string, run: Promise<Lane>): Promise<Lane> => {
    const t = Date.now();
    const d = await run;
    trace.push({ step, label, ms: Date.now() - t, count: (d.results?.entities ?? d.results?.demographics ?? []).length });
    return d;
  };

  // The venue lane is the ONLY thing that varies by city — artist/brand/demographic affinity is
  // global in Qloo (verified). So run one place lane per tour stop; everything else once.
  const placeLanes = cityList.length
    ? cityList.map((c) => timed("place", `Local partners · insights(place, ${c})`, insights({ filterType: "urn:entity:place", signalEntities: signal, location: c, popularityMax: PLACE_POP_MAX, take: 10 })))
    : [timed("place", "Local partners · skipped (no city)", Promise.resolve<Lane>({ results: { entities: [] } }))];

  const [artistData, brandData, demoData, ...placeDatas] = await Promise.all([
    timed("artist", "Support acts · insights(artist, pop-band)", insights({ filterType: "urn:entity:artist", signalEntities: signal, explainability: true, popularityMin: band.min ?? DEFAULT_POP_MIN, popularityMax: band.max ?? DEFAULT_POP_MAX, take: 25 })),
    timed("brand", "Sponsor fit · insights(brand)", insights({ filterType: "urn:entity:brand", signalEntities: signal, explainability: true, take: 10 })),
    timed("demographics", "Audience read · insights(demographics)", insights({ filterType: "urn:demographics", signalEntities: signal })),
    ...placeLanes,
  ]);

  const lineup: Pick[] = (artistData.results?.entities ?? [])
    .filter((e) => !headlinerIds.has(e.entity_id) && named(e))
    .map((e) => {
      const affinity = e.query?.affinity ?? 0;
      const popularity = e.popularity ?? 0;
      return {
        id: e.entity_id,
        name: e.name,
        affinity,
        popularity,
        gemScore: affinity * (1 - popularity),
        isHiddenGem: popularity <= GEM_POPULARITY,
        image: imageOf(e),
        genres: (e.tags ?? []).filter((t) => t.type?.includes("genre")).map((t) => t.name).slice(0, 3),
        drivenBy: attribution(e, idToName),
      };
    })
    .sort((a, b) => b.gemScore - a.gemScore)
    .slice(0, 12);

  const sponsors: Sponsor[] = (brandData.results?.entities ?? [])
    .filter(named)
    .map((e) => ({
      id: e.entity_id,
      name: e.name,
      affinity: e.query?.affinity ?? 0,
      popularity: e.popularity ?? 0,
      image: imageOf(e),
      drivenBy: attribution(e, idToName),
    }))
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, 8);

  const tour = cityList.map((c, i) => ({ city: c, places: toPlaces(placeDatas[i]) }));
  const places = tour[0]?.places ?? [];

  return {
    trace,
    headliners: headliners.map((h) => ({ id: h.entity_id, name: h.name, popularity: h.popularity ?? 0 })),
    city,
    lineup,
    sponsors,
    places,
    tour,
    audience: averageDemographics(demoData.results?.demographics),
    unresolved,
  };
}

export type Clash = { a: string; b: string; score: number };

// Two acts on the bill "clash" when each sits high in the other's taste-neighbor list —
// they pull the same crowd, so booking both wastes a slot. Real Qloo signal: one
// insights(artist, signal=act) per act. Verified: same-scene acts ≈0.95, unrelated absent.
const CLASH_THRESHOLD = 0.7;
export async function findClashes(ids: string[]): Promise<Clash[]> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (uniq.length < 2) return [];
  const maps = await Promise.all(
    uniq.map(async (id) => {
      const r = await insights({ filterType: "urn:entity:artist", signalEntities: [id], take: 50 });
      return new Map((r.results?.entities ?? []).map((e) => [e.entity_id, e.query?.affinity ?? 0]));
    }),
  );
  const clashes: Clash[] = [];
  for (let i = 0; i < uniq.length; i++)
    for (let j = i + 1; j < uniq.length; j++) {
      const score = Math.max(maps[i].get(uniq[j]) ?? 0, maps[j].get(uniq[i]) ?? 0);
      if (score >= CLASH_THRESHOLD) clashes.push({ a: uniq[i], b: uniq[j], score });
    }
  return clashes.sort((x, y) => y.score - x.score);
}

// Qloo returns one demographic entry per headliner; average the signed over/under-index
// values across them for the lineup's combined audience read.
function averageDemographics(entries: unknown[] | undefined): AudienceRead | null {
  const rows = (entries ?? []) as { query?: { age?: Record<string, number>; gender?: Record<string, number> } }[];
  if (!rows.length) return null;
  const avg = (key: "age" | "gender", field: string) => {
    const vals = rows.map((r) => r.query?.[key]?.[field]).filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  return {
    age: AGE_ORDER.map((bracket) => ({ bracket, score: avg("age", bracket) })),
    gender: { male: avg("gender", "male"), female: avg("gender", "female") },
  };
}

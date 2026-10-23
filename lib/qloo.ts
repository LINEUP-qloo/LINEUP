// Server-only Qloo Taste AI client (hackathon API). Holds the API key — never import into client components.
const HOST = process.env.QLOO_HOST ?? "https://hackathon.api.qloo.com";
const KEY = process.env.QLOO_API_KEY;

export type QlooEntity = {
  entity_id: string;
  name: string;
  subtype?: string; // e.g. "urn:entity:place"
  types?: string[];
  popularity?: number; // 0..1
  tags?: { name: string; tag_id: string; type: string }[];
  properties?: Record<string, unknown> & { image?: { url?: string } };
  external?: Record<string, unknown>;
  query?: {
    affinity?: number; // 0..1 rank score
    explainability?: {
      "signal.interests.entities"?: { entity_id: string; score: number }[];
    };
  };
};

// Qloo rate-limits ~8 burst → keep <=4 requests in flight.
// ponytail: fixed global cap + linear backoff; swap for p-limit if call sites multiply.
const MAX = 4;
let active = 0;
const waiters: (() => void)[] = [];
async function acquire() {
  if (active >= MAX) await new Promise<void>((r) => waiters.push(r));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function qloo(path: string, params: Record<string, string | number | undefined>) {
  if (!KEY) throw new Error("QLOO_API_KEY not set (add it to .env)");
  const url = new URL(HOST + path);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  await acquire();
  try {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: { "X-Api-Key": KEY } });
      if (res.status === 429 && attempt < 3) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`Qloo ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
      return res.json();
    }
  } finally {
    release();
  }
}

/** Resolve a name to an entity, preferring the requested type (defaults to artist). */
export async function search(query: string, preferType = "urn:entity:artist"): Promise<QlooEntity | null> {
  const j = await qloo("/search", { query });
  const rs: QlooEntity[] = j?.results ?? [];
  return rs.find((r) => (r.types ?? []).includes(preferType) || r.subtype === preferType) ?? rs[0] ?? null;
}

export async function insights(opts: {
  filterType: string;
  signalEntities?: string[];
  location?: string;
  explainability?: boolean;
  popularityMin?: number; // 0..1 — floor out total unknowns
  popularityMax?: number; // 0..1 — ceiling out already-famous acts (the "undercard" knob)
  take?: number;
}): Promise<{ results?: { entities?: QlooEntity[]; demographics?: unknown[] }; query?: unknown }> {
  return qloo("/v2/insights", {
    "filter.type": opts.filterType,
    "signal.interests.entities": opts.signalEntities?.join(","),
    "filter.location.query": opts.location,
    "filter.popularity.min": opts.popularityMin,
    "filter.popularity.max": opts.popularityMax,
    "feature.explainability": opts.explainability ? "true" : undefined,
    take: opts.take ?? 10,
  });
}

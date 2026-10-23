#!/usr/bin/env node
// Hour-zero Qloo API verification for "Lineup".
// Run:  QLOO_API_KEY=xxxx node verify-qloo.mjs
// No deps (Node 18+ built-in fetch). Exploratory probe: prints raw shapes
// because exact param/field names are unconfirmed — adapt from the output.

const HOST = process.env.QLOO_HOST || "https://hackathon.api.qloo.com";
const KEY = process.env.QLOO_API_KEY;
if (!KEY) { console.error("Set QLOO_API_KEY (the hackathon key, not staging/prod)."); process.exit(1); }

const results = {}; // check -> PASS | FAIL | UNKNOWN

async function call(path, params = {}) {
  const url = new URL(HOST + path);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "X-Api-Key": KEY, Accept: "application/json" } });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, json, url: url.toString() };
}

function show(label, r, max = 1600) {
  const body = typeof r.json === "string" ? r.json : JSON.stringify(r.json, null, 2);
  console.log(`\n=== ${label} ===\n${r.status} ${r.url}\n${body.slice(0, max)}${body.length > max ? "\n…(truncated)" : ""}`);
}

// Walk an object to pull the first plausible entity id (field name unknown).
function findEntityId(obj) {
  const seen = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (/^(entity_?id|id)$/i.test(k) && typeof v === "string") seen.push([k, v]);
      walk(v);
    }
  };
  walk(obj);
  return seen[0]?.[1] || null;
}

(async () => {
  // --- Check 1: key works + entity search shape ---
  let artistId = null;
  try {
    const r = await call("/search", { query: "Radiohead" });
    show("CHECK 1  /search?query=Radiohead", r);
    if (r.ok) {
      artistId = findEntityId(r.json);
      console.log(`\n-> resolved entity id: ${artistId ?? "NOT FOUND (inspect field names above)"}`);
      results.search = artistId ? "PASS" : "UNKNOWN";
    } else results.search = "FAIL";
  } catch (e) { console.error("CHECK 1 error:", e.message); results.search = "FAIL"; }

  // --- Check 2: THE existential one — cross-type (artist signal -> place) ---
  // If this is empty/garbage, the whole cross-domain thesis is dead. Pivot now.
  if (artistId) {
    for (const loc of [null, "New York City", "Los Angeles"]) {
      try {
        const r = await call("/v2/insights", {
          "filter.type": "urn:entity:place",
          "signal.interests.entities": artistId,
          "filter.location.query": loc,
          take: 5,
        });
        show(`CHECK 2  cross-type artist->place (location=${loc ?? "none"})`, r);
        const n = Array.isArray(r.json?.results?.entities) ? r.json.results.entities.length
                : Array.isArray(r.json?.results) ? r.json.results.length : 0;
        if (r.ok && n > 0) { results.crossType = "PASS"; console.log(`\n-> ${n} places returned. Cross-domain works.`); break; }
        results.crossType ??= r.ok ? "UNKNOWN" : "FAIL";
      } catch (e) { console.error("CHECK 2 error:", e.message); results.crossType ??= "FAIL"; }
    }
  } else { results.crossType = "UNKNOWN"; console.log("\nCHECK 2 skipped: no entity id from search."); }

  // --- Check 3: explainability (the demo weapon) ---
  if (artistId) {
    try {
      const r = await call("/v2/insights", {
        "filter.type": "urn:entity:artist",
        "signal.interests.entities": artistId,
        "feature.explainability": "true",
        take: 5,
      });
      show("CHECK 3  explainability=true (artist->artist)", r);
      const hasWhy = /explain|reason|because|affinit/i.test(JSON.stringify(r.json));
      results.explainability = r.ok ? (hasWhy ? "PASS" : "UNKNOWN") : "FAIL";
      console.log(`\n-> reason/explain signal present: ${hasWhy}`);
    } catch (e) { console.error("CHECK 3 error:", e.message); results.explainability = "FAIL"; }
  }

  // --- Check 4: demographics as a signal (print exact accepted values) ---
  if (artistId) {
    for (const age of ["35_and_younger", "36_to_55", "55_and_older", "25_to_29"]) {
      try {
        const r = await call("/v2/insights", {
          "filter.type": "urn:entity:brand",
          "signal.interests.entities": artistId,
          "signal.demographics.age": age,
          take: 3,
        });
        console.log(`\nCHECK 4  age="${age}" -> ${r.status}${r.ok ? " ok" : " REJECTED (bad value?)"}`);
        if (r.ok) results.demographics = "PASS";
        else { results.demographics ??= "UNKNOWN"; show(`  rejected age=${age}`, r, 400); }
      } catch (e) { console.error("CHECK 4 error:", e.message); results.demographics ??= "FAIL"; }
    }
  }

  // --- Check 5: rate limit (burst) ---
  try {
    const burst = await Promise.all(Array.from({ length: 12 }, () => call("/search", { query: "Tame Impala" })));
    const codes = burst.map(b => b.status);
    const limited = codes.includes(429);
    console.log(`\nCHECK 5  burst of 12 -> statuses: ${codes.join(",")}  ${limited ? "(429 SEEN — budget your calls)" : "(no 429)"}`);
    const rl = burst[0];
    const hdr = {}; // surface any rate headers if present
    for (const h of ["x-ratelimit-limit","x-ratelimit-remaining","retry-after"]) hdr[h] = rl?.headers?.get?.(h);
    results.rateLimit = limited ? "LIMITED" : "OK";
  } catch (e) { console.error("CHECK 5 error:", e.message); results.rateLimit = "FAIL"; }

  console.log("\n\n======== SUMMARY ========");
  for (const [k, v] of Object.entries(results)) console.log(`${v.padEnd(8)} ${k}`);
  console.log("\nGo/No-go: CHECK 2 (crossType) is the gate. PASS -> build Lineup. FAIL -> pivot to Threadmatch or rethink.");
})();

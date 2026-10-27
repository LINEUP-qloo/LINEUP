// Server-only: turn a LineupResult into a short, GROUNDED promoter's brief via Groq.
// The LLM only narrates facts Qloo produced — it is told never to invent acts/brands/numbers.
import type { LineupResult } from "./lineup";

const KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM =
  "You are a veteran live-music talent buyer and festival programmer. Write in a sharp, confident industry voice. " +
  "Use ONLY the facts provided. Never invent artists, brands, venues, or numbers. " +
  "No markdown, no bullet points, no headings, no preamble. Never use em dashes; use commas or periods.";

function digest(r: LineupResult): string {
  const first = (n: string) => n.split(/[ ,]/)[0];
  const lines: string[] = [];
  lines.push(`Headliners: ${r.headliners.map((h) => h.name).join("; ")}${r.city ? `; city: ${r.city}` : ""}`);
  if (r.audience) {
    const age = r.audience.age.map((a) => `${a.bracket} ${a.score >= 0 ? "+" : ""}${a.score.toFixed(2)}`).join(", ");
    lines.push(`Audience over/under-index: age ${age}; gender male ${r.audience.gender.male.toFixed(2)}, female ${r.audience.gender.female.toFixed(2)}`);
  }
  lines.push("Top undercard picks (affinity; driven by which headliner):");
  for (const p of r.lineup.slice(0, 8)) {
    const by = p.drivenBy.map((d) => `${first(d.name)} ${Math.round(d.score * 100)}%`).join(" / ");
    lines.push(`- ${p.name} (${p.affinity.toFixed(2)}; ${by})${p.isHiddenGem ? " [hidden gem]" : ""}`);
  }
  if (r.sponsors.length) lines.push(`Top sponsor fits: ${r.sponsors.slice(0, 6).map((s) => s.name).join(", ")}`);
  if (r.places.length) lines.push(`Top local partners: ${r.places.slice(0, 6).map((p) => p.name).join(", ")}`);
  return lines.join("\n");
}

export async function narrate(r: LineupResult): Promise<string | null> {
  if (!KEY || !r.headliners.length) return null;
  const prompt =
    `Facts:\n${digest(r)}\n\n` +
    "Write a 2-3 sentence programming brief for this bill: the undercard strategy and why it fits this specific crowd, " +
    "the audience it pulls, and one sponsor or local-partner angle. Name actual acts/brands from the facts. Punchy, no fluff.";
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 800,
        reasoning_effort: "low",
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    const text: string | undefined = j?.choices?.[0]?.message?.content;
    return text?.trim().replace(/^["']|["']$/g, "") || null;
  } catch (e) {
    console.error("narrate failed:", (e as Error).message);
    return null; // brief is optional flavor — never break the core result
  }
}

const PITCH_SYSTEM =
  "You are the partnerships lead for a live-music promoter pitching a brand sponsorship. " +
  "Write a short outreach email: a 'Subject:' line, then a 4-6 sentence body. Confident, specific, no fluff. " +
  "Use ONLY the facts provided. Never invent artists, brands, venues, demographics, or numbers. No markdown, no bullet points. Never use em dashes; use commas or periods.";

// A real deliverable: a grounded sponsorship outreach email to a specific brand, built from
// the measured audience + that brand's own Qloo affinity. Same no-inventing guarantee as the brief.
export async function sponsorPitch(r: LineupResult, sponsorName: string): Promise<string | null> {
  if (!KEY || !r.headliners.length || !sponsorName) return null;
  const s = r.sponsors.find((x) => x.name.toLowerCase() === sponsorName.toLowerCase());
  const prompt =
    `Facts:\n${digest(r)}\n\nPitch target brand: ${sponsorName}${s ? ` (measured audience affinity ${s.affinity.toFixed(2)})` : ""}\n\n` +
    `Write the sponsorship outreach email from the promoter to ${sponsorName}'s brand-partnerships team proposing they sponsor this bill. ` +
    `Cite the measured audience over-index (age/gender) and ${sponsorName}'s affinity, name 1-2 headliners and one undercard act, and propose a concrete activation. Subject line first.`;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: PITCH_SYSTEM },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 900,
        reasoning_effort: "low",
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    return j?.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("pitch failed:", (e as Error).message);
    return null;
  }
}

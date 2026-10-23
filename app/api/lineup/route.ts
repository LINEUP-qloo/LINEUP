import { NextRequest, NextResponse } from "next/server";
import { buildLineup } from "@/lib/lineup";

// Names can contain commas ("Tyler, the Creator"), so use repeated ?h= params,
// or a single ?headliners= split on "|". e.g. ?h=Tyler, the Creator&h=Phoebe Bridgers&city=Atlanta
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const repeated = sp.getAll("h");
  const headliners = (repeated.length ? repeated : (sp.get("headliners") ?? "").split("|"))
    .map((s) => s.trim())
    .filter(Boolean);
  const city = sp.get("city") ?? undefined;
  const num = (k: string) => (sp.get(k) != null ? Number(sp.get(k)) : undefined);
  const band = { min: num("minPop"), max: num("maxPop") };

  if (!headliners.length) {
    return NextResponse.json({ error: "pass ?h=Name (repeatable) or ?headliners=a|b|c (optional &city=... &minPop= &maxPop=)" }, { status: 400 });
  }
  try {
    return NextResponse.json(await buildLineup(headliners, city, band));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sponsorPitch } from "@/lib/narrate";
import type { LineupResult } from "@/lib/lineup";

// POST { result, sponsor } → a grounded sponsorship outreach email (or null if unavailable).
export async function POST(req: NextRequest) {
  try {
    const { result, sponsor } = (await req.json()) as { result: LineupResult; sponsor: string };
    if (!result?.headliners?.length || !sponsor) return NextResponse.json({ pitch: null });
    return NextResponse.json({ pitch: await sponsorPitch(result, sponsor) });
  } catch (e) {
    return NextResponse.json({ pitch: null, error: (e as Error).message });
  }
}

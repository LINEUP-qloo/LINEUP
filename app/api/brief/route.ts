import { NextRequest, NextResponse } from "next/server";
import { narrate } from "@/lib/narrate";
import type { LineupResult } from "@/lib/lineup";

// POST a LineupResult, get back a grounded promoter's brief (or null if unavailable).
// Always 200 — the brief is optional flavor and must never break the main result.
export async function POST(req: NextRequest) {
  try {
    const result = (await req.json()) as LineupResult;
    if (!result?.headliners?.length) return NextResponse.json({ brief: null });
    return NextResponse.json({ brief: await narrate(result) });
  } catch (e) {
    return NextResponse.json({ brief: null, error: (e as Error).message });
  }
}

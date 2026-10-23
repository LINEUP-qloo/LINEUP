import { NextRequest, NextResponse } from "next/server";
import { findClashes } from "@/lib/lineup";

// POST { ids: string[] } → pairs of bill acts that pull the same crowd (taste-neighbor overlap).
export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids?: string[] };
    return NextResponse.json({ clashes: await findClashes(ids ?? []) });
  } catch (e) {
    return NextResponse.json({ clashes: [], error: (e as Error).message });
  }
}

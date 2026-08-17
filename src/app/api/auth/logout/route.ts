import { NextResponse } from "next/server";
import { clearTeamCookie } from "@/lib/auth";

export async function POST() {
  await clearTeamCookie();
  return NextResponse.json({ ok: true });
}

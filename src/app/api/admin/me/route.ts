import { NextResponse } from "next/server";
import { getIsAdminFromCookies } from "@/lib/auth";

export async function GET() {
  const isAdmin = await getIsAdminFromCookies();
  return NextResponse.json({ isAdmin });
}

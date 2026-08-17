import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

// Mirrors /api/sounds/[category] for public/videos/<category>.
const CATEGORIES = ["wrong_pass", "right_pass", "help", "winning"] as const;
type Category = (typeof CATEGORIES)[number];

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  if (!CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "Unknown video category" }, { status: 404 });
  }

  const dir = path.join(process.cwd(), "public", "videos", category);

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && VIDEO_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
    return NextResponse.json({ files }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

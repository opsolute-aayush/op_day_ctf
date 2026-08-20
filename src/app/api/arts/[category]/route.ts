import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

// Mirrors /api/sounds/[category] and /api/videos/[category] for
// public/arts/<category>. Drop image files in and no code changes are needed.
// AsciiOperative picks a random one and re-picks on its own timer.
const CATEGORIES = ["settings", "winner"] as const;
type Category = (typeof CATEGORIES)[number];

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  if (!CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "Unknown art category" }, { status: 404 });
  }

  const dir = path.join(process.cwd(), "public", "arts", category);

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && IMAGE_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
    return NextResponse.json({ files }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

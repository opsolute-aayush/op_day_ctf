import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

// Lets the client discover whatever .mp3 files are actually sitting in
// public/sounds/<category> — drop a file in, it plays, no code change and
// no filename to type anywhere. Category is whitelisted so this can't be
// used to list arbitrary directories on the server.
const CATEGORIES = ["wrong_pass", "right_pass", "help", "winning"] as const;
type Category = (typeof CATEGORIES)[number];

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  if (!CATEGORIES.includes(category as Category)) {
    return NextResponse.json({ error: "Unknown sound category" }, { status: 404 });
  }

  const dir = path.join(process.cwd(), "public", "sounds", category);

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && AUDIO_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
    return NextResponse.json({ files }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

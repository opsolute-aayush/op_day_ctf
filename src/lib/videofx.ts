"use client";

// Video clips are segregated by moment and auto-discovered from disk, the
// same way public/sounds/<category> works (see src/lib/sfx.ts) — drop a clip
// into the matching folder and it starts playing alongside the sound effect:
// public/videos/wrong_pass/  — an incorrect password or word
// public/videos/right_pass/  — a password or word confirmed correctly
// public/videos/help/        — a hint being released
// public/videos/winning/     — a team finishing the whole hunt (green-screen —
//                               rendered chroma-keyed by VideoOverlay, not
//                               played as a plain rectangle)
//
// Discovery happens via GET /api/videos/<category>. A category with no clips
// dropped in yet is a silent no-op — unlike sfx.ts there's no meaningful
// synthesized substitute for video, so nothing plays until an asset exists.

export type VideoCategory = "wrong_pass" | "right_pass" | "help" | "winning";

export interface VideoClipEventDetail {
  category: VideoCategory;
  src: string;
}

const VIDEO_EVENT = "opday:play-video";

const fileListCache = new Map<VideoCategory, string[]>();
const fileListInFlight = new Map<VideoCategory, Promise<string[]>>();

async function getFileList(category: VideoCategory): Promise<string[]> {
  const cached = fileListCache.get(category);
  if (cached) return cached;

  const pending = fileListInFlight.get(category);
  if (pending) return pending;

  const promise = fetch(`/api/videos/${category}`, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { files: [] }))
    .then((data: { files?: string[] }) => {
      const files = data.files ?? [];
      fileListCache.set(category, files);
      fileListInFlight.delete(category);
      return files;
    })
    .catch(() => {
      fileListInFlight.delete(category);
      return [];
    });

  fileListInFlight.set(category, promise);
  return promise;
}

const lastPlayed: Record<VideoCategory, string | null> = {
  wrong_pass: null,
  right_pass: null,
  help: null,
  winning: null,
};

/**
 * Picks a random clip from public/videos/<category> and broadcasts it via a
 * window event. VideoOverlay (mounted once in the root layout) is the sole
 * listener and actually renders it — this function never touches the DOM
 * itself, so it's safe to call from anywhere (modals, pages, hooks).
 */
export async function playVideoClip(category: VideoCategory) {
  if (typeof window === "undefined") return;
  const files = await getFileList(category);
  if (files.length === 0) return;

  const candidates = files.length > 1 ? files.filter((f) => f !== lastPlayed[category]) : files;
  const filename = candidates[Math.floor(Math.random() * candidates.length)];
  lastPlayed[category] = filename;

  const src = `/videos/${category}/${encodeURIComponent(filename)}`;
  window.dispatchEvent(new CustomEvent<VideoClipEventDetail>(VIDEO_EVENT, { detail: { category, src } }));
}

export function subscribeToVideoClips(handler: (detail: VideoClipEventDetail) => void): () => void {
  function listener(e: Event) {
    handler((e as CustomEvent<VideoClipEventDetail>).detail);
  }
  window.addEventListener(VIDEO_EVENT, listener);
  return () => window.removeEventListener(VIDEO_EVENT, listener);
}

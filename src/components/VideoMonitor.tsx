"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import ChromaKeyVideo from "@/components/ChromaKeyVideo";
import { subscribeToVideoClips, type VideoCategory, type VideoClipEventDetail } from "@/lib/videofx";

interface VideoMonitorProps {
  categories: VideoCategory[];
  title?: string;
  caption?: string;
}

/** The bordered "signal-monitor.exe" box from /play, extracted so other
 * pages can replay a different set of video categories the same way. */
export default function VideoMonitor({
  categories,
  title = "signal-monitor.exe",
  caption = "Last video feedback triggered, replayed here.",
}: VideoMonitorProps) {
  const [lastClip, setLastClip] = useState<VideoClipEventDetail | null>(null);

  useEffect(
    () =>
      subscribeToVideoClips((detail) => {
        if (categories.includes(detail.category)) setLastClip(detail);
      }),
    // `categories` is expected to be a stable literal from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <TerminalPanel title={title}>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border-2 border-panel-border bg-black">
        <div className="scanlines pointer-events-none absolute inset-0 z-10 opacity-30" />
        {lastClip ? (
          <ChromaKeyVideo
            key={lastClip.src}
            src={lastClip.src}
            onEnded={() => setLastClip(null)}
            className="h-full w-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neon-500/50">
            <Radio className="h-6 w-6 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-widest">No Signal</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-neon-100/30">{caption}</p>
    </TerminalPanel>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subscribeToVideoClips, VideoClipEventDetail } from "@/lib/videofx";
import ChromaKeyVideo from "@/components/ChromaKeyVideo";

const MAX_CLIP_MS = 9000;

// right_pass/help used to pop up top-left, but PlayerStatsPanel's
// signal-monitor already mirrors every clip category. Showing those two
// there as well meant the same video played twice on screen at once. Same
// story for winning, now mirrored by the winner page's own VideoMonitor.
// This popup only handles wrong_pass, anchored bottom-center.
const POPUP_CATEGORIES: VideoClipEventDetail["category"][] = ["wrong_pass"];

/**
 * Global pop-up player for playVideoClip() clips, mounted once in the root
 * layout. Every category is green-screen footage, so all of them go through
 * ChromaKeyVideo.
 */
export default function VideoOverlay() {
  const [clip, setClip] = useState<VideoClipEventDetail | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToVideoClips((detail) => {
      if (!POPUP_CATEGORIES.includes(detail.category)) return;
      setClip(detail);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setClip(null), MAX_CLIP_MS);
    });
    return () => {
      unsubscribe();
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  function close() {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setClip(null);
  }

  return (
    <AnimatePresence>
      {clip && (
        <motion.div
          key={clip.src}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.92 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center"
        >
          <ChromaKeyVideo src={clip.src} onEnded={close} className="h-52 w-52 sm:h-72 sm:w-72" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

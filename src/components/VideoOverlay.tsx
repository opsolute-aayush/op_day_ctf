"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import { subscribeToVideoClips, VideoClipEventDetail } from "@/lib/videofx";

const MAX_CLIP_MS = 9000;

/**
 * Global pop-up player for the clips triggered by playVideoClip() — mounted
 * once in the root layout so it works from any page without prop drilling.
 * Every non-winning category plays as a small "signal intercept" clip
 * bottom-right. The winning category is rendered bigger and chroma-keyed
 * (see ChromaKeyVideo) since those clips are shot on a green screen and a
 * plain rectangle of green would look broken over the confetti/victory UI.
 */
export default function VideoOverlay() {
  const [clip, setClip] = useState<VideoClipEventDetail | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToVideoClips((detail) => {
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

  const isWinning = clip?.category === "winning";

  return (
    <AnimatePresence>
      {clip && (
        <motion.div
          key={clip.src}
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={
            isWinning
              ? "pointer-events-none fixed inset-x-0 bottom-2 z-50 flex justify-center"
              : "pointer-events-none fixed bottom-4 right-4 z-50"
          }
        >
          {isWinning ? (
            <ChromaKeyVideo src={clip.src} onEnded={close} className="h-56 w-56 sm:h-72 sm:w-72" />
          ) : (
            <div className="terminal-panel relative w-40 overflow-hidden rounded-md sm:w-52">
              <div className="flex items-center gap-1 border-b border-panel-border bg-void-2/90 px-2 py-1">
                <Radio className="h-3 w-3 animate-pulse text-danger-400" />
                <span className="text-[9px] uppercase tracking-widest text-neon-100/60">signal_intercept</span>
              </div>
              <video
                src={clip.src}
                autoPlay
                playsInline
                className="block h-24 w-full object-cover sm:h-32"
                onEnded={close}
                onError={close}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ChromaKeyVideoProps {
  src: string;
  onEnded: () => void;
  className?: string;
}

/**
 * Plays a green-screen clip with the green background keyed out live, frame
 * by frame, via canvas pixel manipulation — so it reads as a floating
 * subject over the page instead of an ugly green rectangle. The source
 * <video> itself stays hidden; only the processed canvas is shown.
 */
function ChromaKeyVideo({ src, onEnded, className = "" }: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    function draw() {
      if (!video || video.paused || video.ended) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        if (canvas!.width !== w || canvas!.height !== h) {
          canvas!.width = w;
          canvas!.height = h;
        }
        ctx!.drawImage(video, 0, 0, w, h);
        const frame = ctx!.getImageData(0, 0, w, h);
        const data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (g > 90 && g > r * 1.25 && g > b * 1.25) {
            // Clearly green-screen background — cut it fully transparent.
            data[i + 3] = 0;
          } else if (g > r * 1.05 && g > b * 1.05) {
            // Green spill on the subject's edges — pull the green channel
            // down toward the other two instead of a hard cutoff, so the
            // fringe doesn't look choppy against whatever the page shows.
            data[i + 1] = Math.round((r + b) / 2);
          }
        }
        ctx!.putImageData(frame, 0, 0);
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    function handlePlay() {
      rafRef.current = requestAnimationFrame(draw);
    }

    video.addEventListener("play", handlePlay);
    void video.play().catch(() => onEnded());

    return () => {
      video.removeEventListener("play", handlePlay);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className={className}>
      <video ref={videoRef} src={src} playsInline className="hidden" onEnded={onEnded} onError={onEnded} />
      <canvas ref={canvasRef} className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(57,255,20,0.35)]" />
    </div>
  );
}

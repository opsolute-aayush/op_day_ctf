"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subscribeToVideoClips, VideoClipEventDetail } from "@/lib/videofx";

const MAX_CLIP_MS = 9000;

/**
 * Global pop-up player for playVideoClip() clips, mounted once in the root
 * layout. Every category is green-screen footage, so all of them go through
 * ChromaKeyVideo and anchor to the bottom-center of the viewport.
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

interface ChromaKeyVideoProps {
  src: string;
  onEnded: () => void;
  className?: string;
}

// Greenness = how much green dominates over red/blue. Below KEY_LOW: opaque
// subject; above KEY_HIGH: fully transparent background; between the two,
// alpha ramps via smoothstep instead of a hard cutoff so edges blend cleanly.
const KEY_LOW = 18;
const KEY_HIGH = 65;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Plays a green-screen clip with the green background keyed out live, frame
 * by frame, via canvas pixel manipulation — so it reads as a subject
 * composited into the page instead of a rectangle of green. The source
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
          const greenness = g - Math.max(r, b);

          let alpha = 255;
          if (greenness >= KEY_HIGH) {
            alpha = 0;
          } else if (greenness > KEY_LOW) {
            const t = (greenness - KEY_LOW) / (KEY_HIGH - KEY_LOW);
            alpha = Math.round(255 * (1 - smoothstep(t)));
          }
          data[i + 3] = alpha;

          // Spill suppression, proportional to how keyed-out this pixel
          // is — pulls green-tinted fringe pixels toward neutral instead of
          // leaving a green halo around the subject's edges.
          if (alpha < 255 && greenness > 0) {
            const suppress = 1 - alpha / 255;
            data[i + 1] = Math.round(g - suppress * greenness * 0.6);
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
      <canvas ref={canvasRef} className="h-full w-full object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.45)]" />
    </div>
  );
}

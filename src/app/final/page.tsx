"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ArrowLeftRight } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import SentenceBuilder from "@/components/SentenceBuilder";

export default function FinalPage() {
  const router = useRouter();
  const { status, loading, unauthorized } = useTeamStatus(4000);
  const [order, setOrder] = useState<string[] | null>(null);
  const [seededForTeam, setSeededForTeam] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (unauthorized) router.replace("/register");
  }, [unauthorized, router]);

  useEffect(() => {
    if (status && !status.finalUnlocked && !status.completed) router.replace("/play");
  }, [status, router]);

  useEffect(() => {
    if (status?.completed) router.replace("/winner");
  }, [status, router]);

  // Seed the reorderable word list once, the first time this team's status arrives
  // (adjusting state during render, per React's guidance, instead of an effect).
  if (status && seededForTeam !== status.team.id) {
    setSeededForTeam(status.team.id);
    setOrder(status.collectedWords);
  }

  if (loading || !status || order === null) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">loading assembly console</p>
      </main>
    );
  }

  const preview = useManual ? manualText : order.join(" ");

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/game/submit-final-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Not quite right.");
        setSubmitting(false);
        return;
      }
      router.replace("/winner");
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <header className="text-center space-y-2">
        <Flag className="mx-auto h-8 w-8 text-cyan-400" />
        <GlitchTitle text="Final Assembly" className="text-2xl" as="h1" />
        <p className="text-sm text-neon-100/60">
          Drag your collected words into the correct order, then transmit.
        </p>
      </header>

      <TerminalPanel title="sentence-builder.exe">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-neon-400/70">
              {useManual ? "Manual entry" : "Drag to reorder"}
            </span>
            <button
              type="button"
              onClick={() => setUseManual((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {useManual ? "Use drag-and-drop" : "Type it out instead"}
            </button>
          </div>

          {useManual ? (
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type the full assembled sentence..."
              rows={4}
              className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 text-neon-100 placeholder:text-neon-100/30 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
            />
          ) : (
            <SentenceBuilder words={order} onChange={setOrder} />
          )}

          <div className="rounded-md border border-panel-border bg-void px-3 py-2.5 text-sm text-neon-500">
            “{preview || "…"}”
          </div>

          {error && (
            <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
              {error}
            </p>
          )}

          <NeonButton onClick={handleSubmit} disabled={submitting || !preview.trim()} className="w-full">
            {submitting ? "Transmitting…" : "Submit Final Sentence"}
          </NeonButton>
        </div>
      </TerminalPanel>
    </main>
  );
}

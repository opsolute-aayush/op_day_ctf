"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal, Users, Check, ChevronRight } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import TeamAvatar from "@/components/TeamAvatar";
import MatrixRain from "@/components/MatrixRain";

interface JoinableTeam {
  id: string;
  teamNumber: number;
  name: string;
  color: string;
  members: string[];
}

export default function RegisterPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<JoinableTeam[] | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/game/teams", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setTeams(data.teams);
      } catch {
        if (!cancelled) setTeams([]);
      }
    }
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId) ?? null;

  function selectTeam(team: JoinableTeam) {
    setSelectedTeamId((prev) => (prev === team.id ? null : team.id));
    setTeamNameDraft(team.name);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedTeamId) {
      setError("Pick your squad first.");
      return;
    }
    if (memberName.trim().length < 1) {
      setError("Enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/join-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          memberName: memberName.trim(),
          teamName: teamNameDraft.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't join that team.");
        setSubmitting(false);
        return;
      }
      router.push("/play");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full space-y-6">
        <div className="space-y-2 text-center">
          <Terminal className="mx-auto h-8 w-8 text-neon-500" />
          <GlitchTitle text="Join The Hunt" className="text-2xl" as="h1" />
          <p className="font-mono text-sm text-neon-500/80">
            <span className="caret-blink">{"> scanning for available squads..."}</span>
          </p>
        </div>

        <TerminalPanel title="join-team.sh" className="relative overflow-hidden">
          <MatrixRain columns={12} className="opacity-10" />
          <div className="relative z-10">
            {teams === null ? (
              <p className="caret-blink text-sm text-neon-500">loading squads</p>
            ) : teams.length === 0 ? (
              <div className="space-y-2 py-4 text-center">
                <Users className="mx-auto h-6 w-6 text-neon-100/30" />
                <p className="text-sm text-neon-100/60">No squads have been set up yet.</p>
                <p className="text-xs text-neon-100/30">Ask the Game Master to create your squad, then refresh.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neon-400/80">
                    Select Your Squad — {teams.length} online
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {teams.map((team) => {
                      const selected = selectedTeamId === team.id;
                      return (
                        <motion.button
                          key={team.id}
                          type="button"
                          onClick={() => selectTeam(team)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative flex flex-col items-center gap-1.5 overflow-hidden rounded-md border px-2 py-3 text-center transition-colors ${
                            selected ? "bg-white/5" : "border-panel-border bg-void-2/60 hover:border-neon-100/40"
                          }`}
                          style={selected ? { borderColor: team.color, boxShadow: `0 0 16px ${team.color}55` } : undefined}
                        >
                          {selected && (
                            <>
                              <span
                                className="hud-corner pointer-events-none absolute left-1 top-1 h-2.5 w-2.5 border-l-2 border-t-2"
                                style={{ borderColor: team.color }}
                              />
                              <span
                                className="hud-corner pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 border-r-2 border-t-2"
                                style={{ borderColor: team.color }}
                              />
                              <span
                                className="hud-corner pointer-events-none absolute bottom-1 left-1 h-2.5 w-2.5 border-b-2 border-l-2"
                                style={{ borderColor: team.color }}
                              />
                              <span
                                className="hud-corner pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2"
                                style={{ borderColor: team.color }}
                              />
                            </>
                          )}
                          <span className="font-display text-[10px] uppercase tracking-widest text-neon-100/30">
                            SQD #{String(team.teamNumber).padStart(2, "0")}
                          </span>
                          <TeamAvatar teamNumber={team.teamNumber} color={team.color} size="md" />
                          <span className="block w-full truncate text-sm font-semibold" style={selected ? { color: team.color } : undefined}>
                            {team.name}
                          </span>
                          <span className="block truncate text-[11px] text-neon-100/40">
                            {team.members.length > 0 ? `${team.members.length} agent${team.members.length === 1 ? "" : "s"}` : "no agents yet"}
                          </span>
                          {selected && (
                            <span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: team.color }}>
                              <Check className="h-3 w-3" /> linked
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {selectedTeam && (
                    <motion.div
                      key="registration-console"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-4 overflow-hidden rounded-md border border-panel-border bg-void-2/60 p-4"
                    >
                      <p className="flex items-center gap-1.5 font-mono text-xs text-neon-500/80">
                        <ChevronRight className="h-3.5 w-3.5" /> initializing uplink to{" "}
                        <span style={{ color: selectedTeam.color }}>{selectedTeam.name}</span>
                      </p>

                      <InputField
                        label="Squad Name (yours to customize)"
                        value={teamNameDraft}
                        onChange={(e) => setTeamNameDraft(e.target.value)}
                        maxLength={60}
                        autoComplete="off"
                      />

                      <InputField
                        label="Your Name"
                        placeholder="e.g. Priya"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        maxLength={40}
                        autoComplete="off"
                        autoFocus
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                    {error}
                  </p>
                )}

                <NeonButton type="submit" disabled={submitting || !selectedTeamId} className="w-full">
                  {submitting ? "Linking…" : "Join Squad"}
                </NeonButton>
              </form>
            )}
          </div>
        </TerminalPanel>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal, Users, Check, ChevronRight, KeyRound, ArrowLeft, Trophy } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import TeamAvatar from "@/components/TeamAvatar";
import MatrixRain from "@/components/MatrixRain";
import ColorPicker from "@/components/ColorPicker";
import { getPlayerName, setPlayerName, subscribeToPlayerNameStore } from "@/lib/playerIdentity";
import { getSavedSessionCode, setSavedSessionCode, clearSavedSessionCode } from "@/lib/sessionIdentity";
import { getDeviceId } from "@/lib/deviceIdentity";

interface JoinableMember {
  name: string;
  active: boolean;
}

interface JoinableTeam {
  id: string;
  teamNumber: number;
  name: string;
  color: string;
  completed: boolean;
  members: JoinableMember[];
}

export default function RegisterPage() {
  const router = useRouter();

  // Step 1 — who are you, and which master's session are you joining? Any
  // number of independent sessions can exist at once, each with its own
  // 6-digit code. The name captured here becomes the single source of truth
  // for this player everywhere else (join, presence, connected-players) —
  // see lib/playerIdentity.ts — instead of asking again at step 2.
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // Step 2 — pick a squad within that session and join it.
  const [teams, setTeams] = useState<JoinableTeam[] | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [teamColorDraft, setTeamColorDraft] = useState("#39FF14");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefills from a prior visit — useSyncExternalStore (not an effect) so
  // the SSR/first-hydration render (no localStorage) and the real client
  // value reconcile without a setState-after-mount flash. nameOverride is
  // only set once the user actually edits the field; until then the value
  // just follows the persisted name.
  const persistedName = useSyncExternalStore(subscribeToPlayerNameStore, getPlayerName, () => "");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const nameDraft = nameOverride ?? persistedName;

  // Resumes straight to the squad list after Leave Team (or any fresh visit
  // from a device that already joined this session before) instead of
  // asking for the code again — falls back to step 1 silently if the saved
  // code no longer resolves (session ended, wrong device, etc.). `resuming`
  // holds step 1 back off-screen while this check is in flight — without
  // it, a returning device would flash step 1 for a beat and then jump to
  // step 2, playing the step-change glitch twice in a row instead of once.
  const [resuming, setResuming] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = getSavedSessionCode();
      if (!saved) {
        if (!cancelled) setResuming(false);
        return;
      }
      try {
        const res = await fetch(`/api/game/teams?code=${saved}`, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          clearSavedSessionCode();
          return;
        }
        const data = await res.json();
        setTeams(data.teams);
        setSessionCode(saved);
      } catch {
        // Network hiccup — leave step 1 visible, no need to clear the saved code for a transient failure.
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionCode) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/game/teams?code=${sessionCode}`, { cache: "no-store" });
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
  }, [sessionCode]);

  // Heartbeats this device's lobby presence (see lib/lobbyPresence.ts),
  // independent of the teams-list poll above — lets the admin/other
  // players see "someone joined the session" within a few seconds of step 1
  // succeeding, instead of only once a team is picked. A ref (not a `nameDraft`
  // dependency) reads the latest name each tick without restarting the
  // interval — it can't change after step 1 anyway (the name field only
  // shows there), but this way nothing depends on that staying true. Stops
  // the moment sessionCode changes or the page unmounts (e.g. navigating to
  // /play after actually joining a team).
  const latestNameRef = useRef(nameDraft);
  useEffect(() => {
    latestNameRef.current = nameDraft;
  }, [nameDraft]);

  useEffect(() => {
    if (!sessionCode) return;
    function heartbeat() {
      const name = latestNameRef.current.trim();
      if (!name) return;
      fetch("/api/game/lobby-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode, deviceId: getDeviceId(), name }),
      }).catch(() => {
        // Transient network error — the next tick retries.
      });
    }
    heartbeat();
    const interval = setInterval(heartbeat, 4000);
    return () => clearInterval(interval);
  }, [sessionCode]);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);

    if (nameDraft.trim().length < 1) {
      setCodeError("Enter your name.");
      return;
    }
    if (!/^\d{6}$/.test(codeDraft)) {
      setCodeError("Enter the 6-digit session code.");
      return;
    }

    setCheckingCode(true);
    try {
      const res = await fetch(`/api/game/teams?code=${codeDraft}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeError(data.error ?? "No session found for that code.");
        return;
      }
      setPlayerName(nameDraft.trim());
      setSavedSessionCode(codeDraft);
      setTeams(data.teams);
      setSessionCode(codeDraft);
    } catch {
      setCodeError("Network error — try again.");
    } finally {
      setCheckingCode(false);
    }
  }

  function changeSession() {
    clearSavedSessionCode();
    setSessionCode(null);
    setTeams(null);
    setSelectedTeamId(null);
    setCodeDraft("");
    setError(null);
  }

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId) ?? null;

  function selectTeam(team: JoinableTeam) {
    setSelectedTeamId((prev) => (prev === team.id ? null : team.id));
    setTeamNameDraft(team.name);
    setTeamColorDraft(team.color);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sessionCode) return;
    if (!selectedTeamId) {
      setError("Pick your squad first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/join-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: sessionCode,
          teamId: selectedTeamId,
          memberName: nameDraft.trim(),
          teamName: teamNameDraft.trim() || undefined,
          teamColor: teamColorDraft || undefined,
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
            <span className="caret-blink">
              {sessionCode ? "> scanning for available squads..." : "> awaiting session code..."}
            </span>
          </p>
        </div>

        {/* Same glitch-reveal keyframe admin's tab switches and /play's
            standby↔levels swap use — reused here (fresh key remounting the
            div, not Framer Motion) so this step change feels consistent
            with the rest of the app. Gated on `resuming` so a returning
            device jumps straight to step 2 with one clean transition
            instead of flashing step 1 first and glitching twice. */}
        {resuming ? (
          <TerminalPanel title="join-session.sh">
            <p className="caret-blink text-sm text-neon-500">{"> resuming session..."}</p>
          </TerminalPanel>
        ) : (
        <div key={sessionCode ? "teams" : "code"} className="glitch-reveal">
        {!sessionCode ? (
          <TerminalPanel title="join-session.sh">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-neon-100/70">
                <KeyRound className="h-4 w-4 shrink-0 text-cyan-400" />
                Tell us who you are, then ask your Game Master for the 6-digit session code.
              </div>
              <InputField
                label="Your Name"
                placeholder="e.g. Adolf"
                value={nameDraft}
                onChange={(e) => setNameOverride(e.target.value)}
                maxLength={40}
                autoComplete="off"
                autoFocus
                className="text-center font-display text-lg tracking-wide"
              />
              <InputField
                label="Session Code"
                placeholder="482913"
                inputMode="numeric"
                maxLength={6}
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value.replace(/\D/g, ""))}
                className="text-center font-display text-xl tracking-[0.3em]"
              />
              {codeError && (
                <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                  {codeError}
                </p>
              )}
              <NeonButton type="submit" className="w-full" disabled={checkingCode} data-sfx-nav>
                {checkingCode ? "Checking…" : "Continue"}
              </NeonButton>
            </form>
          </TerminalPanel>
        ) : (
          <TerminalPanel title="join-team.sh" className="relative overflow-hidden">
            <MatrixRain columns={12} className="opacity-10" />
            <div className="relative z-10">
              <button
                onClick={changeSession}
                className="mb-3 flex items-center gap-1 text-xs text-neon-100/40 hover:text-neon-100/70"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Wrong session? Change code
              </button>

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
                            {team.completed && (
                              <span
                                className="hud-cut-sm absolute right-1.5 top-1.5 z-10 flex items-center gap-1 border border-amber-400/60 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400"
                                title="This squad already finished the hunt"
                              >
                                <Trophy className="h-2.5 w-2.5" /> Done
                              </span>
                            )}
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
                            {team.members.length === 0 ? (
                              <span className="block truncate text-[11px] text-neon-100/40">no agents yet</span>
                            ) : (
                              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-1">
                                {team.members.slice(0, 4).map((m) => (
                                  <span key={m.name} className="inline-flex max-w-full items-center gap-1 text-[10px] text-neon-100/60">
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                        m.active ? "bg-neon-500 shadow-[0_0_4px_1px_rgba(57,255,20,0.8)] animate-pulse" : "bg-neon-100/20"
                                      }`}
                                      title={m.active ? "Active now" : "Not active"}
                                    />
                                    <span className="truncate">{m.name}</span>
                                  </span>
                                ))}
                                {team.members.length > 4 && (
                                  <span className="text-[10px] text-neon-100/30">+{team.members.length - 4}</span>
                                )}
                              </div>
                            )}
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

                        <p className="flex items-center gap-1.5 text-xs text-neon-100/50">
                          Joining as <span className="font-semibold text-neon-100/80">{nameDraft}</span>
                          <span className="text-neon-100/30">— change this anytime in Settings</span>
                        </p>

                        <InputField
                          label="Squad Name (yours to customize)"
                          value={teamNameDraft}
                          onChange={(e) => setTeamNameDraft(e.target.value)}
                          maxLength={60}
                          autoComplete="off"
                        />

                        <div className="flex flex-col gap-2">
                          <label className="text-xs uppercase tracking-widest text-neon-400/80">
                            Squad Theme Color
                          </label>
                          <ColorPicker value={teamColorDraft} onChange={setTeamColorDraft} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                      {error}
                    </p>
                  )}

                  <NeonButton type="submit" disabled={submitting || !selectedTeamId} className="w-full" data-sfx-nav>
                    {submitting ? "Linking…" : "Join Squad"}
                  </NeonButton>
                </form>
              )}
            </div>
          </TerminalPanel>
        )}
        </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Users, Check } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import TeamAvatar from "@/components/TeamAvatar";

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
    setSelectedTeamId(team.id);
    setTeamNameDraft(team.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedTeamId) {
      setError("Pick your team first.");
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
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Terminal className="mx-auto h-8 w-8 text-neon-500" />
          <GlitchTitle text="Join The Hunt" className="text-2xl" as="h1" />
          <p className="text-sm text-neon-100/60">
            The Game Master sets up how many teams exist — pick yours, add your name, and
            optionally give your squad its own name.
          </p>
        </div>

        <TerminalPanel title="join-team.sh">
          {teams === null ? (
            <p className="caret-blink text-sm text-neon-500">loading teams</p>
          ) : teams.length === 0 ? (
            <div className="space-y-2 py-4 text-center">
              <Users className="mx-auto h-6 w-6 text-neon-100/30" />
              <p className="text-sm text-neon-100/60">No teams have been set up yet.</p>
              <p className="text-xs text-neon-100/30">Ask the Game Master to create your team, then refresh.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-neon-400/80">Your Team</label>
                <div className="space-y-2">
                  {teams.map((team) => {
                    const selected = selectedTeamId === team.id;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => selectTeam(team)}
                        className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                          selected ? "border-current bg-white/5" : "border-panel-border hover:border-neon-100/30"
                        }`}
                        style={selected ? { color: team.color, borderColor: team.color } : undefined}
                      >
                        <TeamAvatar teamNumber={team.teamNumber} color={team.color} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{team.name}</span>
                          <span className="block truncate text-xs text-neon-100/40">
                            {team.members.length > 0 ? team.members.join(", ") : "no members yet"}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedTeam && (
                <InputField
                  label="Squad Name (yours to customize)"
                  value={teamNameDraft}
                  onChange={(e) => setTeamNameDraft(e.target.value)}
                  maxLength={60}
                  autoComplete="off"
                />
              )}

              <InputField
                label="Your Name"
                placeholder="e.g. Priya"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                maxLength={40}
                autoComplete="off"
                required
              />

              {error && (
                <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                  {error}
                </p>
              )}

              <NeonButton type="submit" disabled={submitting} className="w-full">
                {submitting ? "Joining…" : "Join Team"}
              </NeonButton>
            </form>
          )}
        </TerminalPanel>
      </div>
    </main>
  );
}

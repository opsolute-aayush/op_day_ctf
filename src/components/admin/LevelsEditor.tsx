"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Lock, ListChecks, Shuffle, Copy, Check } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import TeamAvatar from "@/components/TeamAvatar";
import { generateCipher, type CipherResult } from "@/lib/cipher";

interface TeamOption {
  id: string;
  teamNumber: number;
  name: string;
  color: string;
}

interface Level {
  levelNumber: number;
  locationClue: string;
  wordReward: string;
  hint: string | null;
  hasPassword: boolean;
}

interface LevelDraft {
  locationClue: string;
  wordReward: string;
  hint: string;
  password: string;
}

function toDraft(level: Level): LevelDraft {
  return { locationClue: level.locationClue, wordReward: level.wordReward, hint: level.hint ?? "", password: "" };
}

// Turns whatever the admin typed into the passphrase/password field into the
// decoy-padded, shuffled, Base64 "encrypted message" from cipher.md — purely
// a display tool for crafting the physical clue. Saving the level still
// hashes the same typed word as the team's real unlock password untouched.
function PassphraseCipherPanel({ passphrase }: { passphrase: string }) {
  const [result, setResult] = useState<CipherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    setCopied(false);
    try {
      setResult(generateCipher(passphrase));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Failed to encrypt.");
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.base64);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2 rounded-md border border-cyan-400/20 bg-void-2/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-widest text-cyan-400/80">Encrypted Message (for teams)</span>
        <NeonButton
          variant="cyan"
          onClick={generate}
          disabled={!passphrase.trim()}
          className="px-2 py-1 text-xs"
        >
          <Shuffle className="h-3 w-3" /> {result ? "Regenerate" : "Encrypt Passphrase"}
        </NeonButton>
      </div>
      {!passphrase.trim() && (
        <p className="text-xs text-neon-100/30">Type a passphrase above to generate its encrypted message.</p>
      )}
      {error && <p className="text-xs text-danger-400">{error}</p>}
      {result && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <textarea
              readOnly
              rows={3}
              value={result.base64}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none rounded-md border border-panel-border bg-void px-2 py-1.5 font-mono text-xs text-neon-100 outline-none"
            />
            <button
              type="button"
              onClick={copy}
              title="Copy"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-panel-border text-neon-100/60 transition-colors hover:text-cyan-400"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-xs text-neon-100/40">
            Decoys used: <span className="text-neon-100/70">{result.decoys.join(", ")}</span>
          </p>
          <p className="text-xs text-amber-400/80">
            Admin eyes only — the real passphrase is candidate #{result.answerIndex} of 5 once decoded. Never share
            this index with teams.
          </p>
        </div>
      )}
    </div>
  );
}

export default function LevelsEditor({ onChanged }: { onChanged: () => void }) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/teams", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setTeams(data.teams);
      setSelectedTeamId((prev) => prev ?? data.teams[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  async function addTeam() {
    setCreatingTeam(true);
    setCreateError(null);
    const res = await fetch("/api/admin/teams", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setCreatingTeam(false);
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to create team.");
      return;
    }
    setSelectedTeamId(data.team.id);
    setNonce((n) => n + 1);
    onChanged();
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
      <div className="space-y-6">
        <TerminalPanel title="teams.list">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-neon-400/70">
              {teams.length} team{teams.length === 1 ? "" : "s"} — players can only join these, never create their own
            </p>
            <NeonButton variant="cyan" onClick={addTeam} disabled={creatingTeam}>
              <Plus className="h-4 w-4" /> {creatingTeam ? "Adding…" : "Add Team"}
            </NeonButton>
          </div>
          {createError && <p className="mb-2 text-sm text-danger-400">{createError}</p>}
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm transition-colors ${
                  selectedTeamId === team.id
                    ? "border-current bg-white/5"
                    : "border-panel-border text-neon-100/50 hover:text-neon-100/80"
                }`}
                style={selectedTeamId === team.id ? { color: team.color, borderColor: team.color } : undefined}
              >
                <TeamAvatar teamNumber={team.teamNumber} color={team.color} size="sm" />
                {team.name}
              </button>
            ))}
            {teams.length === 0 && <p className="text-sm text-neon-100/30">No teams yet — click Add Team above.</p>}
          </div>
        </TerminalPanel>

        {selectedTeamId && <TeamPuzzleEditor key={selectedTeamId} teamId={selectedTeamId} onChanged={onChanged} />}
      </div>

      <div className="space-y-6">
        <TerminalPanel title="how-this-works.txt" className="border-cyan-400/20">
          <ol className="space-y-1 text-sm text-neon-100/70">
            <li>
              <span className="text-cyan-400">1.</span> Click <span className="text-cyan-400">Add Team</span> once
              per physical group — no typing needed, each gets a number automatically.
            </li>
            <li>
              <span className="text-cyan-400">2.</span> Pick a team and fill in its passwords, clues, words, and
              final sentence.
            </li>
            <li>
              <span className="text-cyan-400">3.</span> Head to <span className="text-cyan-400">Game Control</span>{" "}
              to start the hunt once every team is configured.
            </li>
          </ol>
        </TerminalPanel>
      </div>
    </div>
  );
}

function TeamPuzzleEditor({ teamId, onChanged }: { teamId: string; onChanged: () => void }) {
  const [team, setTeam] = useState<TeamOption | null>(null);
  const [sentence, setSentence] = useState("");
  const [sentenceSaving, setSentenceSaving] = useState(false);
  const [sentenceMessage, setSentenceMessage] = useState<string | null>(null);

  const [levels, setLevels] = useState<Level[]>([]);
  const [drafts, setDrafts] = useState<Record<number, LevelDraft>>({});
  const [savingLevel, setSavingLevel] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<LevelDraft>({ locationClue: "", wordReward: "", hint: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLevels() {
    const res = await fetch(`/api/admin/teams/${teamId}/levels`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setLevels(data.levels);
    setDrafts(Object.fromEntries(data.levels.map((l: Level) => [l.levelNumber, toDraft(l)])));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [teamRes, levelsRes] = await Promise.all([
        fetch(`/api/admin/teams/${teamId}`, { cache: "no-store" }),
        fetch(`/api/admin/teams/${teamId}/levels`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        if (!cancelled) {
          setSentence(teamData.team.winningSentence);
          setTeam(teamData.team);
        }
      }
      if (levelsRes.ok) {
        const levelsData = await levelsRes.json();
        if (!cancelled) {
          setLevels(levelsData.levels);
          setDrafts(Object.fromEntries(levelsData.levels.map((l: Level) => [l.levelNumber, toDraft(l)])));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  function updateDraft(levelNumber: number, patch: Partial<LevelDraft>) {
    setDrafts((prev) => ({ ...prev, [levelNumber]: { ...prev[levelNumber], ...patch } }));
  }

  async function saveSentence() {
    setSentenceSaving(true);
    setSentenceMessage(null);
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winningSentence: sentence }),
    });
    setSentenceSaving(false);
    if (res.ok) {
      setSentenceMessage("Saved.");
      onChanged();
    } else {
      const data = await res.json().catch(() => ({}));
      setSentenceMessage(data.error ?? "Failed to save.");
    }
  }

  async function saveLevel(levelNumber: number) {
    const draft = drafts[levelNumber];
    setSavingLevel(levelNumber);
    setError(null);
    const body: Record<string, string> = {
      locationClue: draft.locationClue,
      wordReward: draft.wordReward,
      hint: draft.hint,
    };
    if (draft.password.trim()) body.password = draft.password;

    const res = await fetch(`/api/admin/teams/${teamId}/levels/${levelNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingLevel(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save level.");
      return;
    }
    updateDraft(levelNumber, { password: "" });
    onChanged();
  }

  async function deleteLevel(levelNumber: number) {
    if (!confirm(`Delete Level ${levelNumber} for this team? Levels above it will renumber down.`)) return;
    await fetch(`/api/admin/teams/${teamId}/levels/${levelNumber}`, { method: "DELETE" });
    await loadLevels();
    onChanged();
  }

  async function createLevel() {
    if (!newLevel.password.trim() || !newLevel.locationClue.trim() || !newLevel.wordReward.trim()) {
      setError("New level needs a password, location clue, and word reward.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/admin/teams/${teamId}/levels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: newLevel.password,
        locationClue: newLevel.locationClue,
        wordReward: newLevel.wordReward,
        hint: newLevel.hint || undefined,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create level.");
      return;
    }
    setNewLevel({ locationClue: "", wordReward: "", hint: "", password: "" });
    await loadLevels();
    onChanged();
  }

  return (
    <div className="space-y-4">
      {team && (
        <div className="flex items-center gap-3 px-1">
          <TeamAvatar teamNumber={team.teamNumber} color={team.color} />
          <div>
            <p className="text-xs uppercase tracking-widest text-neon-100/40">Editing Puzzle For</p>
            <p className="flex items-center gap-1.5 font-display text-lg uppercase tracking-widest" style={{ color: team.color }}>
              <ListChecks className="h-4 w-4" /> {team.name}
            </p>
          </div>
        </div>
      )}

      <TerminalPanel title="winning-sentence.cfg" className="border-cyan-400/30">
        <p className="mb-2 text-xs text-neon-100/50">
          This team&apos;s own final sentence — unique per team, editable any time.
        </p>
        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 text-neon-100 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
        />
        <div className="mt-3 flex items-center gap-3">
          <NeonButton variant="cyan" onClick={saveSentence} disabled={sentenceSaving || !sentence.trim()}>
            <Save className="h-4 w-4" /> {sentenceSaving ? "Saving…" : "Save Sentence"}
          </NeonButton>
          {sentenceMessage && <span className="text-xs text-neon-400">{sentenceMessage}</span>}
        </div>
      </TerminalPanel>

      {error && (
        <p className="rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {levels.map((level) => {
        const draft = drafts[level.levelNumber];
        if (!draft) return null;
        return (
          <TerminalPanel key={level.levelNumber} title={`level-${level.levelNumber}.cfg`}>
            <div className="space-y-3">
              <InputField
                label="Location Clue"
                value={draft.locationClue}
                onChange={(e) => updateDraft(level.levelNumber, { locationClue: e.target.value })}
              />
              <InputField
                label="Word Reward"
                value={draft.wordReward}
                onChange={(e) => updateDraft(level.levelNumber, { wordReward: e.target.value })}
              />
              <InputField
                label="Hint (optional, released manually)"
                value={draft.hint}
                onChange={(e) => updateDraft(level.levelNumber, { hint: e.target.value })}
              />
              <InputField
                label="Passphrase — Set New Password (leave blank to keep current)"
                placeholder={level.hasPassword ? "•••• already set •••• " : "required"}
                value={draft.password}
                onChange={(e) => updateDraft(level.levelNumber, { password: e.target.value })}
              />
              <PassphraseCipherPanel passphrase={draft.password} />
              <div className="flex items-center gap-3 pt-1">
                <NeonButton onClick={() => saveLevel(level.levelNumber)} disabled={savingLevel === level.levelNumber}>
                  <Save className="h-4 w-4" /> {savingLevel === level.levelNumber ? "Saving…" : "Save"}
                </NeonButton>
                <NeonButton variant="danger" onClick={() => deleteLevel(level.levelNumber)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </NeonButton>
                <span className="ml-auto flex items-center gap-1 text-xs text-neon-100/30">
                  <Lock className="h-3 w-3" /> password never sent to client
                </span>
              </div>
            </div>
          </TerminalPanel>
        );
      })}

      <TerminalPanel title={`level-${levels.length + 1}.cfg — new`} className="border-cyan-400/30">
        <div className="space-y-3">
          <InputField
            label="Location Clue"
            value={newLevel.locationClue}
            onChange={(e) => setNewLevel((p) => ({ ...p, locationClue: e.target.value }))}
          />
          <InputField
            label="Word Reward"
            value={newLevel.wordReward}
            onChange={(e) => setNewLevel((p) => ({ ...p, wordReward: e.target.value }))}
          />
          <InputField
            label="Hint (optional)"
            value={newLevel.hint}
            onChange={(e) => setNewLevel((p) => ({ ...p, hint: e.target.value }))}
          />
          <InputField
            label="Passphrase / Password"
            value={newLevel.password}
            onChange={(e) => setNewLevel((p) => ({ ...p, password: e.target.value }))}
          />
          <PassphraseCipherPanel passphrase={newLevel.password} />
          <NeonButton variant="cyan" onClick={createLevel} disabled={creating}>
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add Level"}
          </NeonButton>
        </div>
      </TerminalPanel>
      </div>
    </div>
  );
}

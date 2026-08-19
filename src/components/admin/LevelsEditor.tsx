"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Lock, ListChecks, Copy, Check } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import TeamAvatar from "@/components/TeamAvatar";
import { generateCipher } from "@/lib/cipher";

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
  cipherMessage: string | null;
  hasPassword: boolean;
}

interface LevelDraft {
  locationClue: string;
  wordReward: string;
  hint: string;
  cipherMessage: string;
  password: string;
}

function toDraft(level: Level): LevelDraft {
  return {
    locationClue: level.locationClue,
    wordReward: level.wordReward,
    hint: level.hint ?? "",
    cipherMessage: level.cipherMessage ?? "",
    password: "",
  };
}

// Standalone cipher scratchpad, decoupled from any specific level/team —
// admin types any word and picks a difficulty to see its encrypted form.
// Only "Easy" actually runs cipher.md's pipeline today; the other tiers are
// stubbed pending their own encoding schemes.
function CipherSelector() {
  const [password, setPassword] = useState("");
  const [encrypted, setEncrypted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function runDifficulty(difficulty: "easy" | "medium" | "hard" | "intense") {
    setCopied(false);
    setError(null);
    if (difficulty !== "easy") {
      setEncrypted("Coming soon");
      return;
    }
    try {
      setEncrypted(generateCipher(password).base64);
    } catch (err) {
      setEncrypted("");
      setError(err instanceof Error ? err.message : "Failed to encrypt.");
    }
  }

  async function copy() {
    if (!encrypted) return;
    await navigator.clipboard.writeText(encrypted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <TerminalPanel title="cipher-selector.sh" className="border-cyan-400/20">
      <div className="space-y-3">
        <InputField
          label="Enter Password"
          placeholder="Word to encrypt"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-widest text-neon-400/80">Encoded Password</label>
          <div className="flex items-start gap-2">
            <textarea
              readOnly
              rows={3}
              value={encrypted}
              placeholder="Encrypted output appears here"
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-xs text-neon-100 placeholder:text-neon-100/30 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
            />
            <button
              type="button"
              onClick={copy}
              title="Copy"
              disabled={!encrypted}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-panel-border text-neon-100/60 transition-colors hover:text-cyan-400 disabled:opacity-30"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-danger-400">{error}</p>}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {(["easy", "medium", "hard", "intense"] as const).map((difficulty) => (
            <NeonButton
              key={difficulty}
              variant={difficulty === "easy" ? "cyan" : "ghost"}
              onClick={() => runDifficulty(difficulty)}
              disabled={!password.trim()}
              className="px-2 py-1.5 text-xs capitalize"
            >
              {difficulty}
            </NeonButton>
          ))}
        </div>
      </div>
    </TerminalPanel>
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

        <CipherSelector />
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
  const [newLevel, setNewLevel] = useState<LevelDraft>({
    locationClue: "",
    wordReward: "",
    hint: "",
    cipherMessage: "",
    password: "",
  });
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
    if (!draft.cipherMessage.trim()) {
      setError("Ye Lee is required — it's what this team decodes to get the next level's password.");
      return;
    }
    setSavingLevel(levelNumber);
    setError(null);
    const body: Record<string, string> = {
      locationClue: draft.locationClue,
      wordReward: draft.wordReward,
      hint: draft.hint,
      cipherMessage: draft.cipherMessage,
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
    const data = await res.json();
    setLevels((prev) => prev.map((l) => (l.levelNumber === levelNumber ? { ...l, ...data.level } : l)));
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
    if (
      !newLevel.password.trim() ||
      !newLevel.locationClue.trim() ||
      !newLevel.wordReward.trim() ||
      !newLevel.cipherMessage.trim()
    ) {
      setError("New level needs a password, location clue, word reward, and Ye Lee.");
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
        cipherMessage: newLevel.cipherMessage,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create level.");
      return;
    }
    setNewLevel({ locationClue: "", wordReward: "", hint: "", cipherMessage: "", password: "" });
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
                label="Set New Password (leave blank to keep current)"
                placeholder={level.hasPassword ? "•••• already set •••• " : "required"}
                value={draft.password}
                onChange={(e) => updateDraft(level.levelNumber, { password: e.target.value })}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-widest text-neon-400/80">Ye Lee</label>
                <textarea
                  rows={2}
                  value={draft.cipherMessage}
                  onChange={(e) => updateDraft(level.levelNumber, { cipherMessage: e.target.value })}
                  placeholder="Required — encoded password for the NEXT level, paste from cipher-selector.sh"
                  className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-xs text-neon-100 placeholder:text-neon-100/30 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
                />
                <p className="text-xs text-neon-100/30">
                  Shown to this team once they unlock this level — it&apos;s the clue for the level after this one, not
                  this level&apos;s own password.
                </p>
              </div>
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
            label="Password"
            value={newLevel.password}
            onChange={(e) => setNewLevel((p) => ({ ...p, password: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-neon-400/80">Ye Lee</label>
            <textarea
              rows={2}
              value={newLevel.cipherMessage}
              onChange={(e) => setNewLevel((p) => ({ ...p, cipherMessage: e.target.value }))}
              placeholder="Required — encoded password for the NEXT level, paste from cipher-selector.sh"
              className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-xs text-neon-100 placeholder:text-neon-100/30 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
            />
          </div>
          <NeonButton variant="cyan" onClick={createLevel} disabled={creating}>
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add Level"}
          </NeonButton>
        </div>
      </TerminalPanel>
      </div>
    </div>
  );
}

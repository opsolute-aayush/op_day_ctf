"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Lock, ListChecks, Copy, Check } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import TeamAvatar from "@/components/TeamAvatar";
import { generateCipherForDifficulty, type Difficulty } from "@/lib/ciphers";

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

// Severity ramp for the difficulty buttons: cool to hot as the cipher gets harder.
const DIFFICULTY_VARIANT: Record<Difficulty, "cyan" | "amber" | "danger" | "magenta"> = {
  easy: "cyan",
  medium: "amber",
  hard: "danger",
  intense: "magenta",
};

function toDraft(level: Level): LevelDraft {
  return {
    locationClue: level.locationClue,
    wordReward: level.wordReward,
    hint: level.hint ?? "",
    cipherMessage: level.cipherMessage ?? "",
    password: "",
  };
}

// Standalone cipher scratchpad, decoupled from any specific level/team.
// Admin types any word and picks a difficulty to see its encrypted form.
// Each difficulty draws from a pool of techniques in src/lib/ciphers/ and
// picks one at random per run, so the same word never encodes the same way
// twice. Every run is decoded again internally and checked against the
// typed word before it's shown (see generateCipherForDifficulty). Intense
// is stubbed until cipher/intense/*.md specs land.
function CipherSelector() {
  const [password, setPassword] = useState("");
  const [encrypted, setEncrypted] = useState("");
  const [methodUsed, setMethodUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // helper.tpl: pre-written hint ideas per technique (see prisma's CipherHint), keyed by
  // CipherMethod.id. Fetched once. It's small, admin-only reference content, not per-session.
  const [lastMethod, setLastMethod] = useState<{ id: string; label: string } | null>(null);
  const [hintsByMethod, setHintsByMethod] = useState<Record<string, string[]>>({});
  const [hintsError, setHintsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/cipher-hints", { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setHintsError("Couldn't load hint suggestions.");
        return;
      }
      const data = await res.json();
      setHintsByMethod(data.hints ?? {});
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function runDifficulty(difficulty: Difficulty) {
    setCopied(false);
    setError(null);
    try {
      const result = generateCipherForDifficulty(difficulty, password);
      // A technique that needs a grid/key a team can't guess (teamReference)
      // gets it folded right into the copyable block, not just shown to the admin.
      const payload = result.teamReference ? `${result.base64}\n\n${result.teamReference}` : result.base64;
      setEncrypted(payload);
      setMethodUsed(`${result.methodLabel}. Target in slot ${result.answerIndex}/5. Self-verified ✓`);
      setLastMethod({ id: result.methodId, label: result.methodLabel });
    } catch (err) {
      setEncrypted("");
      setMethodUsed(null);
      setLastMethod(null);
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
    <div className="space-y-6">
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
                rows={Math.min(12, Math.max(3, encrypted.split("\n").length))}
                value={encrypted}
                placeholder="Encrypted output appears here"
                onFocus={(e) => e.currentTarget.select()}
                className="w-full resize-none overflow-y-auto rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-xs text-neon-100 placeholder:text-neon-100/30 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
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
            {methodUsed && (
              <p className="text-xs text-cyan-400/80">
                <span className="text-neon-100/40">Method used (admin only, never shown to teams):</span>{" "}
                {methodUsed}
              </p>
            )}
          </div>
          {error && <p className="text-xs text-danger-400">{error}</p>}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {(["easy", "medium", "hard", "intense"] as const).map((difficulty) => (
              <NeonButton
                key={difficulty}
                variant={DIFFICULTY_VARIANT[difficulty]}
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

      <TerminalPanel title="helper.tpl" className="border-cyan-400/20">
        {!lastMethod && (
          <p className="text-sm text-neon-100/40">
            Generate a password above. Hint ideas for whichever technique gets picked show up here.
          </p>
        )}
        {lastMethod && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-neon-400/70">{lastMethod.label}</p>
            {hintsError && <p className="text-xs text-danger-400">{hintsError}</p>}
            {!hintsError && (hintsByMethod[lastMethod.id]?.length ?? 0) === 0 && (
              <p className="text-sm text-neon-100/40">No hint suggestions stored yet for this technique.</p>
            )}
            {!hintsError && (hintsByMethod[lastMethod.id]?.length ?? 0) > 0 && (
              <ol className="list-decimal space-y-1.5 pl-4 text-sm text-neon-100/80">
                {hintsByMethod[lastMethod.id].map((hint, i) => (
                  <li key={i}>{hint}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </TerminalPanel>
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
              {teams.length} team{teams.length === 1 ? "" : "s"}. Players can only join these, never create their own.
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
            {teams.length === 0 && <p className="text-sm text-neon-100/30">No teams yet. Click Add Team above.</p>}
          </div>
        </TerminalPanel>

        {selectedTeamId && <TeamPuzzleEditor key={selectedTeamId} teamId={selectedTeamId} onChanged={onChanged} />}
      </div>

      <div className="space-y-6">
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
  const [genNote, setGenNote] = useState<Record<number, string>>({});
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

  // Ye Lee for level N must decode to level N+1's password, or the puzzle is unsolvable. Generating
  // it here (instead of the disconnected cipher-selector.sh scratchpad) reads that password straight
  // out of the next level's own draft/newLevel.password field, so the two can never drift apart.
  function generateCipherFor(levelNumber: number, difficulty: Difficulty) {
    const isLast = levelNumber === levels.length;
    const targetWord = isLast ? newLevel.password : drafts[levelNumber + 1]?.password ?? "";
    if (!targetWord.trim()) {
      setError(
        isLast
          ? "Type the password for the new level below first, then generate this level's Ye Lee from it."
          : `Type Level ${levelNumber + 1}'s new password first, then generate this level's Ye Lee from it.`
      );
      return;
    }
    try {
      const result = generateCipherForDifficulty(difficulty, targetWord);
      const payload = result.teamReference ? `${result.base64}\n\n${result.teamReference}` : result.base64;
      updateDraft(levelNumber, { cipherMessage: payload });
      setGenNote((prev) => ({
        ...prev,
        [levelNumber]: `${result.methodLabel}. Decodes to "${targetWord.trim().toUpperCase()}" — matches ${
          isLast ? "the new level's" : `Level ${levelNumber + 1}'s`
        } password. Self-verified ✓`,
      }));
      setError(null);
    } catch (err) {
      setGenNote((prev) => ({ ...prev, [levelNumber]: "" }));
      setError(err instanceof Error ? err.message : "Failed to encrypt.");
    }
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
      setError("Ye Lee is required. It's what this team decodes to get the next level's password.");
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
          This team&apos;s own final sentence. Unique per team, editable any time.
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
                <p className="text-xs text-neon-100/30">
                  Shown to this team once they unlock this level. It&apos;s the clue for the level after this one, not
                  this level&apos;s own password. Generate it below from{" "}
                  {level.levelNumber === levels.length ? "the new level's" : `Level ${level.levelNumber + 1}'s`}{" "}
                  password so the two always match.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(["easy", "medium", "hard", "intense"] as const).map((difficulty) => (
                    <NeonButton
                      key={difficulty}
                      variant={DIFFICULTY_VARIANT[difficulty]}
                      onClick={() => generateCipherFor(level.levelNumber, difficulty)}
                      className="px-2 py-1.5 text-xs capitalize"
                    >
                      {difficulty}
                    </NeonButton>
                  ))}
                </div>
                <textarea
                  readOnly
                  rows={2}
                  value={draft.cipherMessage}
                  placeholder="Generate above, or paste manually if you must"
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full resize-none rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-xs text-neon-100 placeholder:text-neon-100/30 outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500"
                />
                {genNote[level.levelNumber] && (
                  <p className="text-xs text-cyan-400/80">{genNote[level.levelNumber]}</p>
                )}
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

      <TerminalPanel title={`level-${levels.length + 1}.cfg (new)`} className="border-cyan-400/30">
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
              placeholder="Required: encoded password for the NEXT level, paste from cipher-selector.sh"
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

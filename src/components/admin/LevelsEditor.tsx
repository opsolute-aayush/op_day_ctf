"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Lock } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";

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

export default function LevelsEditor({ onChanged }: { onChanged: () => void }) {
  const [levels, setLevels] = useState<Level[]>([]);
  const [drafts, setDrafts] = useState<Record<number, LevelDraft>>({});
  const [savingLevel, setSavingLevel] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<LevelDraft>({ locationClue: "", wordReward: "", hint: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/levels", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setLevels(data.levels);
    setDrafts(Object.fromEntries(data.levels.map((l: Level) => [l.levelNumber, toDraft(l)])));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/levels", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setLevels(data.levels);
      setDrafts(Object.fromEntries(data.levels.map((l: Level) => [l.levelNumber, toDraft(l)])));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft(levelNumber: number, patch: Partial<LevelDraft>) {
    setDrafts((prev) => ({ ...prev, [levelNumber]: { ...prev[levelNumber], ...patch } }));
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

    const res = await fetch(`/api/admin/levels/${levelNumber}`, {
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
    if (!confirm(`Delete Level ${levelNumber}? Levels above it will renumber down.`)) return;
    await fetch(`/api/admin/levels/${levelNumber}`, { method: "DELETE" });
    await load();
    onChanged();
  }

  async function createLevel() {
    if (!newLevel.password.trim() || !newLevel.locationClue.trim() || !newLevel.wordReward.trim()) {
      setError("New level needs a password, location clue, and word reward.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/levels", {
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
    await load();
    onChanged();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </p>
      )}

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
          <NeonButton variant="cyan" onClick={createLevel} disabled={creating}>
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add Level"}
          </NeonButton>
        </div>
      </TerminalPanel>
    </div>
  );
}

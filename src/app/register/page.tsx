"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Terminal } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";

const COLORS = [
  "#39FF14",
  "#00F0FF",
  "#FF2ECC",
  "#FFD400",
  "#FF6A00",
  "#B026FF",
  "#FF3B3B",
  "#3B82F6",
];

export default function RegisterPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addMember() {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (members.length >= 12) return;
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setMemberInput("");
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setMemberInput("");
  }

  function removeMember(name: string) {
    setMembers((prev) => prev.filter((m) => m !== name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (teamName.trim().length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }
    if (members.length === 0) {
      setError("Add at least one member.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: teamName.trim(), members, color }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
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
          <GlitchTitle text="Agent Sign-Up" className="text-2xl" as="h1" />
          <p className="text-sm text-neon-100/60">Register your squad before the countdown hits zero.</p>
        </div>

        <TerminalPanel title="register-team.sh">
          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              id="teamName"
              label="Team Codename"
              placeholder="e.g. Code Breakers"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={60}
              autoComplete="off"
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-neon-400/80">Squad Members</label>
              <div className="flex gap-2">
                <InputField
                  placeholder="Add a member name"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember();
                    }
                  }}
                  maxLength={40}
                />
                <NeonButton type="button" variant="ghost" onClick={addMember} className="px-3">
                  <Plus className="h-4 w-4" />
                </NeonButton>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 min-h-8">
                <AnimatePresence>
                  {members.map((m) => (
                    <motion.span
                      key={m}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1 text-xs text-neon-400"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() => removeMember(m)}
                        className="text-neon-400/60 hover:text-danger-400"
                        aria-label={`Remove ${m}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest text-neon-400/80">Squad Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Choose ${c}`}
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#fff" : "transparent",
                      boxShadow: color === c ? `0 0 12px ${c}` : "none",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                {error}
              </p>
            )}

            <NeonButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Registering…" : "Deploy Team"}
            </NeonButton>
          </form>
        </TerminalPanel>
      </div>
    </main>
  );
}

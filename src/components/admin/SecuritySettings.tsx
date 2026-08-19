"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";

export default function SecuritySettings({ sessionCode }: { sessionCode: string | null }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError("At least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't update the password.");
        return;
      }
      setMessage("Password updated. Use it next time you log in.");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TerminalPanel title="admin-security.cfg" className="border-cyan-400/30">
      <div className="mb-4 flex items-start gap-2 text-sm text-neon-100/70">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <p>
          This password unlocks session <span className="text-neon-400">{sessionCode}</span> only. Set a new one any
          time; it takes effect immediately, no restart needed.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
        <InputField
          type="password"
          label="New Password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <InputField
          type="password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && (
          <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-neon-400">{message}</p>}
        <NeonButton variant="cyan" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Update Password"}
        </NeonButton>
      </form>
    </TerminalPanel>
  );
}

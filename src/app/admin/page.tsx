"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, LogOut, KeyRound, PlusCircle, LogIn, Copy, Check, ArrowLeft } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import Leaderboard from "@/components/admin/Leaderboard";
import ActivityFeed from "@/components/admin/ActivityFeed";
import LevelsEditor from "@/components/admin/LevelsEditor";
import GameControls from "@/components/admin/GameControls";

type Tab = "overview" | "levels" | "control" | "security";
type AuthMode = "choose" | "create" | "login";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const [authMode, setAuthMode] = useState<AuthMode>("choose");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ code: string; password: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(d.isAdmin);
        if (d.isAdmin) setSessionCode(d.code);
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleCreateSession() {
    setLoginError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/sessions", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.error ?? "Couldn't create a session.");
        return;
      }
      setCreatedCreds({ code: data.code, password: data.password });
    } finally {
      setCreating(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error ?? "Invalid code or password.");
        return;
      }
      setIsAdmin(true);
      setSessionCode(code);
    } finally {
      setLoggingIn(false);
    }
  }

  function enterDashboard() {
    if (!createdCreds) return;
    setSessionCode(createdCreds.code);
    setCreatedCreds(null);
    setIsAdmin(true);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    setSessionCode(null);
    setAuthMode("choose");
    setCode("");
    setPassword("");
  }

  if (checking) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="caret-blink text-neon-500">verifying clearance</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-neon-500" />
          <GlitchTitle text="Game Master" className="text-2xl" as="h1" />

          {createdCreds ? (
            <SessionCreatedPanel creds={createdCreds} onContinue={enterDashboard} />
          ) : authMode === "choose" ? (
            <TerminalPanel title="admin-auth.sh">
              <div className="space-y-3">
                <NeonButton variant="cyan" className="w-full" onClick={() => setAuthMode("create")}>
                  <PlusCircle className="h-4 w-4" /> Create New Session
                </NeonButton>
                <NeonButton variant="ghost" className="w-full" onClick={() => setAuthMode("login")}>
                  <LogIn className="h-4 w-4" /> Log Into Existing Session
                </NeonButton>
              </div>
            </TerminalPanel>
          ) : authMode === "create" ? (
            <TerminalPanel title="admin-auth.sh">
              <div className="space-y-4">
                <button
                  onClick={() => setAuthMode("choose")}
                  className="flex items-center gap-1 text-xs text-neon-100/40 hover:text-neon-100/70"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <p className="text-left text-sm text-neon-100/70">
                  Spins up a brand-new, independent game — its own teams, puzzles, and leaderboard. You&apos;ll get a
                  6-digit code for players to join with, and a password shown once.
                </p>
                {loginError && (
                  <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                    {loginError}
                  </p>
                )}
                <NeonButton variant="cyan" className="w-full" onClick={handleCreateSession} disabled={creating}>
                  <PlusCircle className="h-4 w-4" /> {creating ? "Creating…" : "Create New Session"}
                </NeonButton>
              </div>
            </TerminalPanel>
          ) : (
            <TerminalPanel title="admin-auth.sh">
              <div className="space-y-4">
                <button
                  onClick={() => setAuthMode("choose")}
                  className="flex items-center gap-1 text-xs text-neon-100/40 hover:text-neon-100/70"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <form onSubmit={handleLogin} className="space-y-4">
                  <InputField
                    label="Session Code"
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                  <InputField
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {loginError && (
                    <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                      {loginError}
                    </p>
                  )}
                  <NeonButton type="submit" className="w-full" disabled={loggingIn} data-sfx-nav>
                    {loggingIn ? "Authenticating…" : "Authenticate"}
                  </NeonButton>
                </form>
              </div>
            </TerminalPanel>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <GlitchTitle text="Game Master" className="text-2xl" as="h1" />
          {sessionCode && (
            <p className="mt-1 text-xs uppercase tracking-widest text-neon-100/40">
              Session code: <span className="text-neon-400">{sessionCode}</span>
            </p>
          )}
        </div>
        <button onClick={handleLogout} data-sfx-nav className="flex items-center gap-1.5 text-xs text-neon-100/40 hover:text-danger-400">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <nav className="flex gap-2 border-b border-panel-border pb-2">
        {(
          [
            ["overview", "Overview"],
            ["levels", "Team Puzzles"],
            ["control", "Game Control"],
            ["security", "Security"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
              tab === t ? "bg-neon-500/10 text-neon-400" : "text-neon-100/40 hover:text-neon-100/70"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "overview" && (
            <div className="space-y-4">
              <Leaderboard refreshKey={refreshKey} />
              <ActivityFeed refreshKey={refreshKey} />
            </div>
          )}

          {tab === "levels" && <LevelsEditor onChanged={() => setRefreshKey((k) => k + 1)} />}

          {tab === "control" && <GameControls onChanged={() => setRefreshKey((k) => k + 1)} />}

          {tab === "security" && <SecuritySettings sessionCode={sessionCode} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked in some contexts — silently ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy to clipboard"
      className="flex shrink-0 items-center gap-1 rounded-md border border-neon-500/40 px-2 py-1 text-[11px] uppercase tracking-widest text-neon-400 hover:bg-neon-500/10"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SessionCreatedPanel({
  creds,
  onContinue,
}: {
  creds: { code: string; password: string };
  onContinue: () => void;
}) {
  return (
    <TerminalPanel title="session-created.sh" className="border-neon-500/40">
      <div className="space-y-4 text-left">
        <p className="flex items-start gap-2 text-sm text-amber-400">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          Save these now — the password won&apos;t be shown again. You can set a new one any time from the Security
          tab.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-neon-400/80">
            Session Code — share with players
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-md border border-panel-border bg-void-2 px-3 py-2.5 text-center font-display text-xl tracking-[0.3em] text-neon-400">
              {creds.code}
            </span>
            <CopyButton value={creds.code} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-neon-400/80">Master Password</label>
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-md border border-panel-border bg-void-2 px-3 py-2.5 font-mono text-sm text-neon-100">
              {creds.password}
            </span>
            <CopyButton value={creds.password} />
          </div>
        </div>

        <NeonButton variant="cyan" className="w-full" onClick={onContinue} data-sfx-nav>
          I&apos;ve saved this — Continue
        </NeonButton>
      </div>
    </TerminalPanel>
  );
}

function SecuritySettings({ sessionCode }: { sessionCode: string | null }) {
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

"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, LogOut, PlusCircle, LogIn, ArrowLeft } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import SessionCreatedPanel from "@/components/admin/SessionCreatedPanel";
import SecuritySettings from "@/components/admin/SecuritySettings";
import Leaderboard from "@/components/admin/Leaderboard";
import ConnectedPlayers from "@/components/admin/ConnectedPlayers";
import ActivityFeed from "@/components/admin/ActivityFeed";
import LevelsEditor from "@/components/admin/LevelsEditor";
import GameControls from "@/components/admin/GameControls";
import SabotageConfig from "@/components/admin/SabotageConfig";
import SabotageLog from "@/components/admin/SabotageLog";
import SwapConfig from "@/components/admin/SwapConfig";
import SwapLog from "@/components/admin/SwapLog";
import AudioVideoSettings from "@/components/AudioVideoSettings";
import { startSettingsMusic, stopSettingsMusic } from "@/lib/sfx";
import { playResolveFeedback } from "@/lib/gameFeedback";

type Tab = "overview" | "levels" | "control" | "sound" | "security";
type AuthMode = "choose" | "create" | "login";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  // Loops for as long as the authenticated dashboard is open, same channel
  // as the player Settings page. Stops the moment the admin signs out.
  useEffect(() => {
    if (!isAdmin) return;
    startSettingsMusic();
    return () => stopSettingsMusic();
  }, [isAdmin]);

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
      playResolveFeedback();
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

          <div key={createdCreds ? "created" : authMode} className="glitch-reveal">
          {createdCreds ? (
            <SessionCreatedPanel creds={createdCreds} onContinue={enterDashboard} />
          ) : authMode === "choose" ? (
            <TerminalPanel title="admin-auth.sh">
              <div className="space-y-3">
                <NeonButton variant="cyan" className="w-full" onClick={() => setAuthMode("create")} data-sfx-nav>
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
                <BackButton onClick={() => setAuthMode("choose")} />
                <p className="text-left text-sm text-neon-100/70">
                  Spins up a brand-new, independent game: its own teams, puzzles, and leaderboard. You&apos;ll get a
                  6-digit code for players to join with, and a password shown once.
                </p>
                {loginError && (
                  <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                    {loginError}
                  </p>
                )}
                <NeonButton variant="cyan" className="w-full" onClick={handleCreateSession} disabled={creating} data-sfx-nav>
                  <PlusCircle className="h-4 w-4" /> {creating ? "Creating…" : "Confirm & Create"}
                </NeonButton>
              </div>
            </TerminalPanel>
          ) : (
            <TerminalPanel title="admin-auth.sh">
              <div className="space-y-4">
                <BackButton onClick={() => setAuthMode("choose")} />
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
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
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

      <nav className="hud-corner-frame relative flex items-stretch gap-1 border border-panel-border bg-void-2/40 px-3 py-2">
        <span className="hud-corner pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-neon-500/60" />
        <span className="hud-corner pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-neon-500/60" />
        <span className="hud-corner pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neon-500/60" />
        <span className="hud-corner pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neon-500/60" />
        {(
          [
            ["overview", "Overview"],
            ["levels", "Team Puzzles"],
            ["control", "Game Control"],
            ["sound", "Sound"],
            ["security", "Security"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-sfx-nav
            className={`relative flex flex-1 items-center justify-center px-2 py-2 text-xs uppercase tracking-widest transition-colors ${
              tab === t ? "text-neon-400" : "text-neon-100/40 hover:text-neon-100/70"
            }`}
          >
            {label}
            {tab === t && <span className="absolute inset-x-2 -bottom-2 h-0.5 bg-neon-500 shadow-[0_0_8px_1px_rgba(57,255,20,0.7)]" />}
          </button>
        ))}
      </nav>

      {/* Same glitch-reveal keyframe RouteTransition uses for real page
          navigations. Reused here (via a fresh key remounting the div, not
          Framer Motion) so tab switches inside the dashboard feel consistent
          with the rest of the app instead of a plain smooth fade. */}
      <div key={tab} className="glitch-reveal">
        <div>
          {tab === "overview" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
              <div className="space-y-6">
                <Leaderboard refreshKey={refreshKey} />
                <ActivityFeed refreshKey={refreshKey} />
              </div>
              <div className="space-y-6">
                <ConnectedPlayers refreshKey={refreshKey} />
                <SabotageLog onChanged={() => setRefreshKey((k) => k + 1)} />
                <SwapLog onChanged={() => setRefreshKey((k) => k + 1)} />
              </div>
            </div>
          )}

          {tab === "levels" && <LevelsEditor onChanged={() => setRefreshKey((k) => k + 1)} />}

          {tab === "control" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
              <div className="space-y-6">
                <GameControls onChanged={() => setRefreshKey((k) => k + 1)} />
              </div>
              <div className="space-y-6">
                <SabotageConfig onChanged={() => setRefreshKey((k) => k + 1)} />
                <SwapConfig onChanged={() => setRefreshKey((k) => k + 1)} />
              </div>
            </div>
          )}

          {tab === "sound" && (
            <TerminalPanel title="audio-video.cfg" className="max-w-lg">
              <AudioVideoSettings />
            </TerminalPanel>
          )}

          {tab === "security" && <SecuritySettings sessionCode={sessionCode} />}
        </div>
      </div>
    </main>
  );
}

// Bracket "key hint" styling (inspired by controller-hint bars like [B] Cancel)
// adapted to our terminal theme: a bordered glyph chip plus the label.
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-2 text-xs text-neon-100/50 hover:text-neon-100/90">
      <span className="hud-cut-sm flex h-5 w-5 items-center justify-center border border-panel-border bg-void-2 text-neon-400 group-hover:border-neon-500/60">
        <ArrowLeft className="h-3 w-3" />
      </span>
      <span className="uppercase tracking-widest">Back</span>
    </button>
  );
}


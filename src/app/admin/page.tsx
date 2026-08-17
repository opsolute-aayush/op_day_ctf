"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import InputField from "@/components/InputField";
import Leaderboard from "@/components/admin/Leaderboard";
import ActivityFeed from "@/components/admin/ActivityFeed";
import LevelsEditor from "@/components/admin/LevelsEditor";
import GameControls from "@/components/admin/GameControls";

type Tab = "overview" | "levels" | "control";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [key, setKey] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error ?? "Invalid key.");
      return;
    }
    setIsAdmin(true);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    setKey("");
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
          <GlitchTitle text="Restricted Access" className="text-2xl" as="h1" />
          <TerminalPanel title="admin-auth.sh">
            <form onSubmit={handleLogin} className="space-y-4">
              <InputField
                type="password"
                placeholder="Master key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
              />
              {loginError && (
                <p className="shake rounded-md border border-danger-400/40 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">
                  {loginError}
                </p>
              )}
              <NeonButton type="submit" className="w-full">
                Authenticate
              </NeonButton>
            </form>
          </TerminalPanel>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <GlitchTitle text="Game Master" className="text-2xl" as="h1" />
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-neon-100/40 hover:text-danger-400">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <nav className="flex gap-2 border-b border-panel-border pb-2">
        {(
          [
            ["overview", "Overview"],
            ["levels", "Team Puzzles"],
            ["control", "Game Control"],
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

      {tab === "overview" && (
        <div className="space-y-4">
          <Leaderboard refreshKey={refreshKey} />
          <ActivityFeed refreshKey={refreshKey} />
        </div>
      )}

      {tab === "levels" && <LevelsEditor onChanged={() => setRefreshKey((k) => k + 1)} />}

      {tab === "control" && <GameControls onChanged={() => setRefreshKey((k) => k + 1)} />}
    </main>
  );
}

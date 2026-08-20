"use client";

import { useState } from "react";
import { KeyRound, Copy, Check } from "lucide-react";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked in some contexts. Silently ignore it.
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

export default function SessionCreatedPanel({
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
          Save these now. The password won&apos;t be shown again. You can set a new one any time from the Security
          tab.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-widest text-neon-400/80">
            Session Code: share with players
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
          I&apos;ve saved this. Continue
        </NeonButton>
      </div>
    </TerminalPanel>
  );
}

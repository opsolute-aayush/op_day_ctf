import Link from "next/link";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl space-y-8 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-400">Aegios // Internal Ops</p>
        <GlitchTitle text="OP DAY" className="text-5xl sm:text-6xl" />
        <GlitchTitle text="CTF PROTOCOL" className="text-2xl sm:text-3xl" as="h2" />

        <TerminalPanel title="root@opday:~$">
          <p className="text-left text-sm leading-relaxed text-neon-100/80">
            <span className="text-neon-500">&gt;</span> initializing scavenger_hunt.exe
            <br />
            <span className="text-neon-500">&gt;</span> physical whiteboard cipher detected
            <br />
            <span className="text-neon-500">&gt;</span> decode. unlock. collect. assemble.
            <br />
            <span className="caret-blink text-neon-500">&gt; awaiting agent registration</span>
          </p>
        </TerminalPanel>

        <Link href="/register" className="inline-block w-full sm:w-auto">
          <NeonButton className="w-full sm:w-auto px-10 py-3.5 text-base">Enter Terminal</NeonButton>
        </Link>

        <div>
          <Link href="/admin" className="text-xs uppercase tracking-widest text-neon-100/30 hover:text-cyan-400">
            Game Master Access →
          </Link>
        </div>
      </div>
    </main>
  );
}

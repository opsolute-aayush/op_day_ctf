import Link from "next/link";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";
import ReportIssueButton from "@/components/ReportIssueButton";

// CSS stagger (fade-slide-in + animationDelay), not Framer Motion. See
// RouteTransition.tsx for why this page can't depend on JS to become visible.
const STAGGER_STEP_S = 0.12;

export default function LandingPage() {
  let step = 0;
  const delay = () => `${(step++ * STAGGER_STEP_S).toFixed(2)}s`;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl space-y-8 text-center">
        <p
          className="fade-slide-in text-xs uppercase tracking-[0.4em] text-cyan-400"
          style={{ animationDelay: delay() }}
        >
          Aegios // Internal Ops
        </p>
        <div className="fade-slide-in" style={{ animationDelay: delay() }}>
          <GlitchTitle text="OP DAY" className="text-5xl sm:text-6xl" />
        </div>
        <div className="fade-slide-in" style={{ animationDelay: delay() }}>
          <GlitchTitle text="CTF PROTOCOL" className="text-2xl sm:text-3xl" as="h2" />
        </div>

        <div className="fade-slide-in" style={{ animationDelay: delay() }}>
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
        </div>

        <div className="fade-slide-in" style={{ animationDelay: delay() }}>
          <Link href="/register" className="inline-block w-full sm:w-auto">
            <NeonButton className="w-full sm:w-auto px-10 py-3.5 text-base">Enter Terminal</NeonButton>
          </Link>
        </div>

        <div className="fade-slide-in" style={{ animationDelay: delay() }}>
          <Link href="/admin" className="text-xs uppercase tracking-widest text-neon-100/30 hover:text-cyan-400">
            Game Master Access →
          </Link>
        </div>
      </div>

      <ReportIssueButton />
    </main>
  );
}

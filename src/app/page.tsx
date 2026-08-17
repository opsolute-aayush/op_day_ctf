"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import GlitchTitle from "@/components/GlitchTitle";
import TerminalPanel from "@/components/TerminalPanel";
import NeonButton from "@/components/NeonButton";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-xl space-y-8 text-center">
        <motion.p variants={item} className="text-xs uppercase tracking-[0.4em] text-cyan-400">
          Aegios // Internal Ops
        </motion.p>
        <motion.div variants={item}>
          <GlitchTitle text="OP DAY" className="text-5xl sm:text-6xl" />
        </motion.div>
        <motion.div variants={item}>
          <GlitchTitle text="CTF PROTOCOL" className="text-2xl sm:text-3xl" as="h2" />
        </motion.div>

        <motion.div variants={item}>
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
        </motion.div>

        <motion.div variants={item}>
          <Link href="/register" className="inline-block w-full sm:w-auto">
            <NeonButton className="w-full sm:w-auto px-10 py-3.5 text-base">Enter Terminal</NeonButton>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/admin" className="text-xs uppercase tracking-widest text-neon-100/30 hover:text-cyan-400">
            Game Master Access →
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

import { Bug } from "lucide-react";

// Prefills a new GitHub issue with a starter template; nothing is ever sent
// on the reporter's behalf. No client JS needed, so this stays a plain
// anchor and doesn't force pages like the home page (see page.tsx's note
// on staying JS-independent) to opt into "use client".
const ISSUE_BODY = ["**What happened?**", "", "", "**What did you expect instead?**", "", ""].join("\n");

const ISSUES_URL = `https://github.com/opsolute-aayush/op_day_ctf/issues/new?labels=bug&body=${encodeURIComponent(
  ISSUE_BODY
)}`;

/** Small, easy-to-ignore corner link. Never a modal or banner, so it can't interrupt gameplay. */
export default function ReportIssueButton() {
  return (
    <a
      href={ISSUES_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Report a bug on GitHub"
      className="fixed bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-panel-border bg-void-2/90 px-3 py-1.5 text-[10px] uppercase tracking-widest text-neon-100/40 opacity-60 backdrop-blur transition-all hover:border-danger-400/50 hover:text-danger-400 hover:opacity-100"
    >
      <Bug className="h-3 w-3" />
      Report Issue
    </a>
  );
}

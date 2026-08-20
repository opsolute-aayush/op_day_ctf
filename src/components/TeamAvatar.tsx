import { Bot, Ghost, Skull, Bug, Radar, Cpu, Fingerprint, Eye, Zap, Binary } from "lucide-react";

// Deterministic per-team "hacker badge" avatar. No uploads needed. Same
// team number always renders the same icon, so it's a stable visual identity
// everywhere (join screen, play hub, leaderboard, winner screen).
const ICONS = [Bot, Ghost, Skull, Bug, Radar, Cpu, Fingerprint, Eye, Zap, Binary];

const SIZES = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4", border: 2 },
  md: { box: "h-11 w-11", icon: "h-5 w-5", border: 2 },
  lg: { box: "h-16 w-16", icon: "h-8 w-8", border: 3 },
} as const;

interface TeamAvatarProps {
  teamNumber: number;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function TeamAvatar({ teamNumber, color, size = "md", className = "" }: TeamAvatarProps) {
  const Icon = ICONS[Math.max(0, teamNumber - 1) % ICONS.length];
  const dims = SIZES[size];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${dims.box} ${className}`}
      style={{
        border: `${dims.border}px solid ${color}`,
        backgroundColor: `${color}1a`,
        boxShadow: `0 0 12px ${color}66`,
      }}
      aria-hidden="true"
    >
      <Icon className={dims.icon} style={{ color }} />
    </div>
  );
}

"use client";

import { Check, Palette } from "lucide-react";

// Same palette the admin's zero-input "Add Team" button cycles through
// (src/app/api/admin/teams/route.ts). Keeps every color a player can pick
// consistent with the ones teams start out with.
const PALETTE = ["#39FF14", "#00F0FF", "#FF2ECC", "#FFD400", "#FF6A00", "#B026FF", "#FF3B3B", "#3B82F6"];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  size?: "sm" | "md";
}

/**
 * Themed neon swatches instead of the browser's bare native color picker box.
 * The rightmost conic-gradient swatch still opens a real `<input
 * type="color">` for shades outside the palette.
 */
export default function ColorPicker({ value, onChange, size = "md" }: ColorPickerProps) {
  const normalized = value.toUpperCase();
  const isCustom = !PALETTE.includes(normalized);
  const dims = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconDims = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((color) => {
        const selected = normalized === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Pick ${color}`}
            aria-pressed={selected}
            className={`group relative flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110 ${dims}`}
          >
            <span
              className="absolute inset-0 rounded-full transition-shadow"
              style={{
                backgroundColor: color,
                boxShadow: selected ? `0 0 14px 2px ${color}, 0 0 3px ${color}` : `0 0 5px 0 ${color}70`,
              }}
            />
            <span
              className={`absolute -inset-[3px] rounded-full border transition-opacity ${
                selected
                  ? "border-neon-100/90 opacity-100"
                  : "border-neon-100/40 opacity-0 group-hover:opacity-70"
              }`}
            />
            {selected && (
              <Check className={`relative ${iconDims} text-void`} strokeWidth={3.5} />
            )}
          </button>
        );
      })}

      <label
        className={`group relative flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-110 ${dims} ${
          isCustom ? "border-neon-100/90" : "border-panel-border"
        }`}
        style={{
          background: isCustom
            ? normalized
            : "conic-gradient(from 0deg, #ff3b3b, #ffd400, #39ff14, #00f0ff, #b026ff, #ff2ecc, #ff3b3b)",
        }}
        title="Custom color"
      >
        {isCustom ? (
          <Check className={`${iconDims} text-void`} strokeWidth={3.5} />
        ) : (
          <Palette className={`${iconDims} text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]`} />
        )}
        <input
          type="color"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Pick a custom color"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

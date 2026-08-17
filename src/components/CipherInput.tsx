"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";

interface CipherInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  value: string;
}

const MIN_CELLS = 9;

/**
 * A password field styled as a row of terminal "cipher cells" instead of a
 * plain box. A real (visually transparent) input drives typing/mobile
 * keyboards/paste/accessibility as usual; the cells are a purely decorative
 * overlay that mirror its value.
 */
const CipherInput = forwardRef<HTMLInputElement, CipherInputProps>(
  ({ value, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const chars = value.split("");
    const cellCount = Math.max(chars.length + 1, MIN_CELLS);

    return (
      <div
        className={`relative overflow-x-auto rounded-md border-2 bg-void-2 transition-colors ${
          focused ? "border-neon-500 shadow-[0_0_16px_rgba(57,255,20,0.35)]" : "border-panel-border"
        }`}
      >
        <input
          ref={ref}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent px-2.5 py-2.5 font-mono text-base tracking-[0.3em] text-transparent caret-transparent outline-none"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          {...props}
        />
        <div className="pointer-events-none flex gap-1 px-2.5 py-2.5">
          {Array.from({ length: cellCount }).map((_, i) => {
            const char = chars[i];
            const isCaret = focused && i === chars.length;
            return (
              <span
                key={`${i}-${char ? "filled" : "empty"}`}
                className={`cipher-cell flex h-8 w-6 shrink-0 items-center justify-center rounded border font-mono text-base font-bold uppercase ${
                  char
                    ? "border-neon-500/60 bg-neon-500/10 text-neon-400 text-glow"
                    : "border-panel-border/60 text-neon-100/20"
                }`}
              >
                {char ?? (isCaret ? <span className="caret-blink text-neon-500" /> : "·")}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
);
CipherInput.displayName = "CipherInput";

export default CipherInput;

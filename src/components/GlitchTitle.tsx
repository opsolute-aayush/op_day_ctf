interface GlitchTitleProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export default function GlitchTitle({ text, className = "", as = "h1" }: GlitchTitleProps) {
  const Tag = as;
  return (
    <Tag
      data-text={text}
      className={`glitch-text font-display uppercase tracking-widest text-neon-500 text-glow ${className}`}
    >
      {text}
    </Tag>
  );
}

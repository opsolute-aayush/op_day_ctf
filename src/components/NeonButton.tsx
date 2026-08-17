import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "ghost" | "danger" | "cyan";

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-neon-500/10 border-neon-500 text-neon-400 hover:bg-neon-500/20 hover:text-neon-100 focus-visible:ring-neon-500",
  ghost:
    "bg-transparent border-panel-border text-neon-100/70 hover:border-neon-500/60 hover:text-neon-400 focus-visible:ring-neon-500",
  danger:
    "bg-danger-400/10 border-danger-400 text-danger-400 hover:bg-danger-400/20 focus-visible:ring-danger-400",
  cyan: "bg-cyan-400/10 border-cyan-400 text-cyan-400 hover:bg-cyan-400/20 focus-visible:ring-cyan-400",
};

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ variant = "primary", className = "", children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.03 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold uppercase tracking-wider
          transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-void
          disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
NeonButton.displayName = "NeonButton";

export default NeonButton;

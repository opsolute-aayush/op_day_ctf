import { InputHTMLAttributes, forwardRef } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs uppercase tracking-widest text-neon-400/80">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full rounded-md border border-panel-border bg-void-2 px-3 py-2.5 text-neon-100 placeholder:text-neon-100/30
            outline-none transition-colors focus:border-neon-500 focus:ring-1 focus:ring-neon-500 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
InputField.displayName = "InputField";

export default InputField;

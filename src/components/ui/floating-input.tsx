import { forwardRef, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Optional adornment shown on the right side */
  endAdornment?: React.ReactNode;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput(
    { label, error, hint, className, id, endAdornment, value, defaultValue, onFocus, onBlur, ...rest },
    ref,
  ) {
    const reactId = useId();
    const inputId = id ?? reactId;
    const [focused, setFocused] = useState(false);
    const hasValue =
      (value !== undefined && value !== "") ||
      (defaultValue !== undefined && defaultValue !== "");
    const floated = focused || hasValue;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholder=" "
            className={cn(
              "peer w-full rounded-xl border bg-background/70 backdrop-blur px-3.5 pt-5 pb-2 text-sm text-foreground transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error
                ? "border-destructive/60 focus:ring-destructive/30 focus:border-destructive"
                : "border-border/70",
              endAdornment ? "pr-10" : "",
              className,
            )}
            {...rest}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "pointer-events-none absolute left-3.5 px-1 transition-all bg-background/0",
              floated
                ? "top-1.5 text-[10px] font-bold uppercase tracking-wider"
                : "top-1/2 -translate-y-1/2 text-sm",
              error
                ? "text-destructive"
                : focused
                  ? "text-primary"
                  : "text-muted-foreground",
            )}
          >
            {label}
          </label>
          {endAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {endAdornment}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={cn(
              "mt-1.5 text-xs px-1",
              error ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);

interface FloatingTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  function FloatingTextarea(
    { label, error, hint, className, id, value, defaultValue, onFocus, onBlur, rows = 4, ...rest },
    ref,
  ) {
    const reactId = useId();
    const inputId = id ?? reactId;
    const [focused, setFocused] = useState(false);
    const hasValue =
      (value !== undefined && value !== "") ||
      (defaultValue !== undefined && defaultValue !== "");
    const floated = focused || hasValue;

    return (
      <div className="w-full">
        <div className="relative">
          <textarea
            id={inputId}
            ref={ref}
            rows={rows}
            value={value}
            defaultValue={defaultValue}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholder=" "
            className={cn(
              "peer w-full rounded-xl border bg-background/70 backdrop-blur px-3.5 pt-5 pb-2 text-sm text-foreground transition-all resize-y",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              error
                ? "border-destructive/60 focus:ring-destructive/30 focus:border-destructive"
                : "border-border/70",
              className,
            )}
            {...rest}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "pointer-events-none absolute left-3.5 px-1 transition-all",
              floated
                ? "top-1.5 text-[10px] font-bold uppercase tracking-wider"
                : "top-4 text-sm",
              error
                ? "text-destructive"
                : focused
                  ? "text-primary"
                  : "text-muted-foreground",
            )}
          >
            {label}
          </label>
        </div>
        {(error || hint) && (
          <p
            className={cn(
              "mt-1.5 text-xs px-1",
              error ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);

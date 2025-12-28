import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function RetroButton({ 
  className, 
  variant = "primary", 
  size = "md",
  children,
  ...props 
}: RetroButtonProps) {
  const variants = {
    primary: "bg-primary text-white border-b-4 border-r-4 border-primary/60 hover:translate-y-1 hover:border-b-0 hover:border-r-0 hover:mt-1 hover:mr-1 active:scale-95",
    secondary: "bg-secondary text-secondary-foreground border-b-4 border-r-4 border-secondary/60 hover:translate-y-1 hover:border-b-0 hover:border-r-0 hover:mt-1 hover:mr-1 active:scale-95",
    danger: "bg-destructive text-white border-b-4 border-r-4 border-destructive/60 hover:translate-y-1 hover:border-b-0 hover:border-r-0 hover:mt-1 hover:mr-1 active:scale-95",
    ghost: "bg-transparent border border-white/20 hover:bg-white/10 text-white",
  };

  const sizes = {
    sm: "px-3 py-1 text-xs font-arcade",
    md: "px-6 py-2 text-sm font-bold font-body uppercase tracking-widest",
    lg: "px-8 py-3 text-lg font-display uppercase tracking-widest",
  };

  return (
    <button
      className={cn(
        "transition-all duration-100 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

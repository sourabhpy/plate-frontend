import React from "react";
import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "inbox" | "todo" | "in_progress" | "in_review" | "done" | "low" | "medium" | "high" | "urgent" | "neutral" | "blue";
  className?: string;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", className, size = "sm" }) => {
  const variants = {
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    inbox: "bg-neutral-100 text-neutral-600 border-neutral-200",
    todo: "bg-neutral-100 text-neutral-800 border-neutral-300",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    in_review: "bg-purple-50 text-purple-700 border-purple-200",
    done: "bg-emerald-50 text-emerald-700 border-emerald-200",
    low: "bg-neutral-100 text-neutral-600 border-neutral-200",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    high: "bg-amber-50 text-amber-800 border-amber-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded border tracking-wide uppercase font-mono",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

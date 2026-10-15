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
    blue: "bg-blue-500 text-white border-blue-500",
    inbox: "bg-white text-neutral-600 border-neutral-200",
    todo: "bg-white text-neutral-800 border-neutral-300",
    in_progress: "bg-blue-500 text-white border-blue-500",
    in_review: "bg-purple-500 text-white border-purple-500",
    done: "bg-emerald-500 text-white border-emerald-500",
    low: "bg-white text-neutral-600 border-neutral-200",
    medium: "bg-blue-500 text-white border-blue-500",
    high: "bg-amber-500 text-white border-amber-500",
    urgent: "bg-red-500 text-white border-red-500",
  };

  const sizes = {
    sm: "px-1.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-bold rounded-md border tracking-wide uppercase",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

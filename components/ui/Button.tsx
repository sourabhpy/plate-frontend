import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer rounded-lg select-none text-start [&>svg]:flex-shrink-0 [&>svg]:shrink-0 [&>span]:line-clamp-1 [&>span]:text-start [&>span]:truncate";

    const variants = {
      primary: "bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 border border-black",
      accent: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-blue-600",
      secondary: "bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300",
      ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
      danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm gap-2",
      md: "h-10 px-4 text-base gap-2.5",
      lg: "h-12 px-6 text-lg gap-3",
    };

    const formattedChildren = React.Children.map(children, (child) => {
      if (typeof child === "string" || typeof child === "number") {
        return <span className="line-clamp-1 truncate text-start">{child}</span>;
      }
      return child;
    });

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-0.5 h-4 w-4 flex-shrink-0 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {formattedChildren}
      </button>
    );
  }
);

Button.displayName = "Button";


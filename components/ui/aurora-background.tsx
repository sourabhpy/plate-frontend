"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-screen items-center justify-center bg-white text-neutral-950 overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Aurora Glow on White Canvas */}
        <div
          className={cn(
            `[--aurora:repeating-linear-gradient(100deg,#3b82f6_10%,#818cf8_15%,#60a5fa_20%,#c084fc_25%,#38bdf8_30%,#f472b6_35%,#3b82f6_40%)]
            [--white-gradient:repeating-linear-gradient(100deg,#ffffff_0%,#ffffff_10%,transparent_15%,transparent_20%,#ffffff_25%)]
            [background-image:var(--white-gradient),var(--aurora)]
            [background-size:300%_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[24px]
            after:content-[""] after:absolute after:inset-0
            after:[background-image:var(--white-gradient),var(--aurora)]
            after:[background-size:200%_150%]
            after:animate-aurora
            after:[mix-blend-mode:multiply]
            pointer-events-none absolute -inset-[20px] opacity-50 will-change-transform`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_25%,transparent_85%)]`
          )}
        />
        {/* Soft atmospheric ambient glow orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
      </div>
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};

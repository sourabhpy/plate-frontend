import React from "react";
import clsx from "clsx";

interface PlateBrandProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showDot?: boolean;
}

export const PlateBrand: React.FC<PlateBrandProps> = ({
  className,
  size = "md",
  showDot = true,
}) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const emojiSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <div className={clsx("inline-flex items-center gap-1.5 select-none font-bold tracking-tight text-neutral-950", sizeClasses[size], className)}>
      <span className={clsx("flex-shrink-0 leading-none", emojiSizes[size])} role="img" aria-label="plate">
        🍽️
      </span>
      <span className="font-bold lowercase">plate</span>
      {showDot && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mb-0.5 flex-shrink-0" />}
    </div>
  );
};

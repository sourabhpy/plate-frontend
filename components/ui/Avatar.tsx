import React from "react";
import clsx from "clsx";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = "md", className }) => {
  const getInitials = (str: string) => {
    if (!str) return "U";
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizes = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
    xl: "w-12 h-12 text-base",
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx(
          "rounded-full object-cover border border-neutral-200 select-none",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full bg-neutral-900 text-white font-medium flex items-center justify-center select-none shrink-0 tracking-wider",
        sizes[size],
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

"use client";

import React, { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={clsx(
          "relative w-full bg-white rounded-lg border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150",
          maxWidths[maxWidth]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
            <div>
              {title && <h2 className="text-lg font-semibold text-neutral-950 tracking-tight">{title}</h2>}
              {description && <p className="text-xs text-neutral-500 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 rounded-md p-1 transition-colors hover:bg-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

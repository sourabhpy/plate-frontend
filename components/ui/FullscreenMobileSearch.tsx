"use client";

import React, { useEffect, useRef } from "react";
import { Search, X, ArrowLeft, ArrowRightIcon } from "lucide-react";
import { useBackStackOverlay } from "@/lib/back-stack";
import clsx from "clsx";

interface FullscreenMobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  chips?: {
    id: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }[];
  children?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitButtonText?: string;
  resultCount?: number;
}

export const FullscreenMobileSearch: React.FC<FullscreenMobileSearchProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  placeholder = "Search...",
  title = "Search",
  chips = [],
  children,
  onSubmit,
  submitButtonText,
  resultCount,
}) => {
  useBackStackOverlay(isOpen, onClose, "mobile-search");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden animate-in fade-in duration-150">
      {/* Top Bar with Back Arrow, Search Input, Clear Button */}
      <div className="p-3 border-b border-neutral-100 flex items-center gap-2 bg-white sticky top-0 z-10 shadow-xs">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-neutral-100 flex-shrink-0"
          aria-label="Close search"
        >
          <ArrowLeft className="w-5 h-5 flex-shrink-0" />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onSubmit) onSubmit(e);
          }}
          className="flex-1 relative flex items-center"
        >
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 flex-shrink-0 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 pl-9 pr-9 text-base bg-neutral-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400 text-neutral-900 transition-colors"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-700 flex-shrink-0"
              aria-label="Clear text"
            >
              <X className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
        </form>

        {submitButtonText && (
          <button
            type="button"
            onClick={(e) => {
              if (onSubmit) onSubmit(e as any);
            }}
            className="px-3 py-2 text-sm font-semibold text-black flex-shrink-0"
          >
            <span className="line-clamp-1">
              <ArrowRightIcon size={20} />
            </span>
          </button>
        )}
      </div>

      {/* Results Header */}
      {resultCount !== undefined && (
        <div className="px-4 py-2 text-xs font-medium text-neutral-400 border-b border-neutral-50">
          <span>{resultCount} {resultCount === 1 ? "result" : "results"} found</span>
        </div>
      )}

      {/* Content / Live Results */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
};

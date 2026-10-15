"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Mic } from "lucide-react";
import clsx from "clsx";

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration?: number;
  messageId: number;
  activePlayingId: number | null;
  onPlay: (id: number) => void;
  onPause: () => void;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration = 0,
  messageId,
  activePlayingId,
  onPlay,
  onPause,
}) => {
  const isCurrent = activePlayingId === messageId;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Keep references to prevent unnecessary re-creations
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;

  const isScrubbingRef = useRef(false);
  isScrubbingRef.current = isScrubbing;

  // Resolve normalized URL
  const normalizedUrl = useMemo(() => {
    if (!audioUrl) return "";
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://") || audioUrl.startsWith("blob:")) {
      return audioUrl;
    }
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
  }, [audioUrl]);

  // Sync with global activePlayingId: when another audio starts playing, pause this one
  useEffect(() => {
    if (!isCurrent && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [isCurrent, isPlaying]);

  // Audio setup - only runs when normalizedUrl changes
  useEffect(() => {
    if (!normalizedUrl) return;

    const audio = new Audio(normalizedUrl);
    audioRef.current = audio;
    audio.preload = "metadata";

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPauseRef.current?.();
    };

    const handleError = (e: Event) => {
      console.error("Audio player error on URL:", normalizedUrl, e, audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [normalizedUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPauseRef.current?.();
    } else {
      audio.playbackRate = playbackRate;
      onPlayRef.current?.(messageId);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Failed to play audio:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const calculateProgressFromEvent = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return rect.width > 0 ? offsetX / rect.width : 0;
  }, []);

  const handleScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    let lastFraction = calculateProgressFromEvent(e.clientX);
    const newTime = lastFraction * (totalDuration || 1);
    setCurrentTime(newTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      lastFraction = calculateProgressFromEvent(moveEvent.clientX);
      setCurrentTime(lastFraction * (totalDuration || 1));
    };

    const handleMouseUp = () => {
      const finalTime = lastFraction * (totalDuration || 1);
      setCurrentTime(finalTime);
      if (audioRef.current) {
        audioRef.current.currentTime = finalTime;
      }
      setIsScrubbing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    const touch = e.touches[0];
    let lastFraction = calculateProgressFromEvent(touch.clientX);
    const newTime = lastFraction * (totalDuration || 1);
    setCurrentTime(newTime);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      lastFraction = calculateProgressFromEvent(moveTouch.clientX);
      setCurrentTime(lastFraction * (totalDuration || 1));
    };

    const handleTouchEnd = () => {
      const finalTime = lastFraction * (totalDuration || 1);
      setCurrentTime(finalTime);
      if (audioRef.current) {
        audioRef.current.currentTime = finalTime;
      }
      setIsScrubbing(false);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = Math.floor(secs % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const progressPercent =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100))
      : 0;

  return (
    <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.08)] w-full max-w-sm mt-1.5 select-none border-none">
      {/* Circular WhatsApp Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={clsx(
          "w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-sm active:scale-95",
          isPlaying
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
            : "bg-neutral-900 text-white hover:bg-neutral-800"
        )}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current flex-shrink-0" />
        ) : (
          <Play className="w-5 h-5 ml-0.5 fill-current flex-shrink-0" />
        )}
      </button>

      {/* Middle: Progress Bar Scrubber and Time */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Interactive Progress Track */}
        <div
          ref={progressBarRef}
          onMouseDown={handleScrubStart}
          onTouchStart={handleTouchStart}
          className="relative h-6 flex items-center cursor-pointer group"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={totalDuration}
          aria-valuenow={currentTime}
        >
          {/* Track background */}
          <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden transition-all group-hover:h-2">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Interactive Scrubber Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-600 ring-2 ring-white shadow-sm pointer-events-none transition-transform group-hover:scale-125"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        {/* Time and Info Row */}
        <div className="flex items-center justify-between text-xs font-medium text-neutral-500 font-mono">
          <span>
            {isPlaying || currentTime > 0
              ? formatTime(currentTime)
              : formatTime(totalDuration)}
          </span>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Mic className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="font-sans text-[11px] text-neutral-400">Voice Note</span>
          </div>
        </div>
      </div>

      {/* WhatsApp-Style Playback Speed Button (1x / 1.5x / 2x) */}
      <button
        type="button"
        onClick={handleSpeedToggle}
        className="px-2 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold font-mono transition-colors flex-shrink-0"
        title="Playback Speed"
      >
        <span className="line-clamp-1">{playbackRate}x</span>
      </button>
    </div>
  );
};

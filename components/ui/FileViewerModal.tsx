"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Image as ImageIcon,
  Music,
  Video,
  File,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import clsx from "clsx";

export interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
  fileType?: string;
  rawContent?: string;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Document",
  fileType = "",
  rawContent = "",
}) => {
  const [textContent, setTextContent] = useState<string>(rawContent);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  // Normalize file extension and category
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const isImage =
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext) ||
    fileType.startsWith("image/");
  const isPdf = ext === "pdf" || fileType.includes("pdf");
  const isTextOrCode =
    ["txt", "md", "markdown", "json", "csv", "js", "ts", "tsx", "py", "html", "css", "yaml", "yml", "log"].includes(ext) ||
    fileType.startsWith("text/") ||
    Boolean(rawContent);
  const isAudio =
    ["mp3", "wav", "ogg", "m4a", "webm", "aac", "flac"].includes(ext) ||
    fileType.startsWith("audio/");
  const isVideo =
    ["mp4", "webm", "mov", "avi", "mkv"].includes(ext) ||
    fileType.startsWith("video/");

  useEffect(() => {
    if (!isOpen) {
      setTextContent("");
      setIsLoadingText(false);
      setLoadError(null);
      setImageZoom(1);
      return;
    }

    if (rawContent) {
      setTextContent(rawContent);
      return;
    }

    // If it's a text/markdown file with a URL, fetch content for direct viewing
    if (isTextOrCode && fileUrl) {
      setIsLoadingText(true);
      setLoadError(null);

      const token = typeof window !== "undefined" ? localStorage.getItem("plate_access_token") : null;
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resolvedUrl = fileUrl.startsWith("http")
        ? fileUrl
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${fileUrl}`;

      fetch(resolvedUrl, { headers })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          setTextContent(text);
        })
        .catch((err) => {
          console.warn("Could not fetch raw text for file viewer:", err);
          setLoadError("Unable to load inline preview for this file.");
        })
        .finally(() => {
          setIsLoadingText(false);
        });
    }
  }, [isOpen, fileUrl, rawContent, isTextOrCode]);

  const handleCopy = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!fileUrl && !textContent) return;
    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (textContent) {
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const resolvedFileUrl = fileUrl
    ? fileUrl.startsWith("http")
      ? fileUrl
      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${fileUrl}`
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      zIndexClassName="z-[60]"
      title={
        <div className="flex items-center gap-2.5 min-w-0 pr-4">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0">
            {isImage && <ImageIcon className="w-4 h-4 text-blue-600" />}
            {isPdf && <FileText className="w-4 h-4 text-red-600" />}
            {isTextOrCode && <FileCode className="w-4 h-4 text-neutral-800" />}
            {isAudio && <Music className="w-4 h-4 text-purple-600" />}
            {isVideo && <Video className="w-4 h-4 text-emerald-600" />}
            {!isImage && !isPdf && !isTextOrCode && !isAudio && !isVideo && (
              <File className="w-4 h-4 text-neutral-500" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-neutral-900 truncate" title={fileName}>
              {fileName}
            </h3>
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              In-App File Viewer {ext ? `• ${ext.toUpperCase()}` : ""}
            </span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 text-xs">
          <div className="flex items-center gap-2">
            {isTextOrCode && textContent && (
              <span className="text-neutral-400">
                {textContent.split("\n").length} lines • {textContent.length.toLocaleString()} characters
              </span>
            )}
            {isImage && (
              <div className="flex items-center gap-1.5 bg-neutral-100 px-2 py-1 rounded-lg text-neutral-700 font-medium">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:text-neutral-950 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1">{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1 hover:text-neutral-950 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(1)}
                  className="p-1 hover:text-neutral-950 transition-colors border-l border-neutral-300 ml-1 pl-1.5"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isTextOrCode && textContent && (
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-8 px-2.5 text-xs">
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </Button>
            )}

            {(fileUrl || textContent) && (
              <Button size="sm" variant="ghost" onClick={handleDownload} className="h-8 px-2.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </Button>
            )}

            {resolvedFileUrl && (
              <a
                href={resolvedFileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Open raw file in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="relative min-h-[350px] max-h-[70vh] overflow-y-auto flex flex-col items-center justify-center rounded-xl bg-neutral-50/70 p-2 sm:p-4">
          {/* 1. Image Viewer */}
          {isImage && resolvedFileUrl && (
            <div className="w-full flex items-center justify-center overflow-auto p-2">
              <img
                src={resolvedFileUrl}
                alt={fileName}
                style={{ transform: `scale(${imageZoom})`, transformOrigin: "center center" }}
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-xs transition-transform duration-150"
              />
            </div>
          )}

          {/* 2. PDF Viewer */}
          {isPdf && resolvedFileUrl && (
            <iframe
              src={resolvedFileUrl}
              title={fileName}
              className="w-full h-[68vh] rounded-lg border border-neutral-200/80 bg-white shadow-xs"
            />
          )}

          {/* 3. Text & Markdown Viewer */}
          {isTextOrCode && (
            <div className="w-full h-full flex flex-col">
              {isLoadingText ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
                  <Sparkles className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-xs">Loading document content...</span>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <p className="text-xs text-red-600 font-medium">{loadError}</p>
                  {resolvedFileUrl && (
                    <a
                      href={resolvedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open file directly</span>
                    </a>
                  )}
                </div>
              ) : (
                <pre className="w-full p-4 sm:p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs text-neutral-900 text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[65vh] select-text">
                  {textContent || "No text content available."}
                </pre>
              )}
            </div>
          )}

          {/* 4. Audio Player */}
          {isAudio && resolvedFileUrl && (
            <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <Music className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-neutral-900 text-center truncate max-w-xs">
                {fileName}
              </span>
              <audio controls className="w-full h-10 mt-1" src={resolvedFileUrl} />
            </div>
          )}

          {/* 5. Video Player */}
          {isVideo && resolvedFileUrl && (
            <video
              controls
              className="max-h-[65vh] max-w-full rounded-xl bg-black shadow-xs"
              src={resolvedFileUrl}
            />
          )}

          {/* 6. Fallback Generic File */}
          {!isImage && !isPdf && !isTextOrCode && !isAudio && !isVideo && (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500">
                <File className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-neutral-900">{fileName}</h4>
              <p className="text-xs text-neutral-500 max-w-sm">
                This file format ({ext.toUpperCase() || "binary"}) can be downloaded or opened directly.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Button size="md" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </Button>
                {resolvedFileUrl && (
                  <Button size="md" variant="ghost" onClick={() => window.open(resolvedFileUrl, "_blank")}>
                    <ExternalLink className="w-4 h-4" />
                    <span>Open External</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

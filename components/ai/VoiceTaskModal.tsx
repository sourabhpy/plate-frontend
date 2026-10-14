"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth, WorkspaceMember } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertCircle,
  MessageSquareQuote,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";

interface ExtractedTaskItem {
  title: string;
  description: string;
  assignee_id: string | null;
  suggested_assignee_name?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string | null;
  evidence_quote?: string;
}

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCommitted?: () => void;
  initialTranscript?: string;
  initialMessageId?: number;
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen,
  onClose,
  onTasksCommitted,
  initialTranscript,
  initialMessageId,
}) => {
  const { members, activeWorkspace, user } = useAuth();
  const [mode, setMode] = useState<"record" | "upload" | "text">("record");
  const [transcript, setTranscript] = useState(initialTranscript || "");
  const [isDirectRecording, setIsDirectRecording] = useState(true);

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);

  // Extraction State
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTaskItem[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  React.useEffect(() => {
    if (initialTranscript) {
      setTranscript(initialTranscript);
      setMode("text");
    }
  }, [initialTranscript]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((p) => p + 1), 1000);
    } catch (err) {
      alert("Microphone permission denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleProcessExtraction = async () => {
    setIsProcessing(true);
    const formData = new FormData();
    if (recordedAudioBlob) {
      formData.append("audio", recordedAudioBlob, "recording.webm");
    }
    if (transcript.trim()) {
      formData.append("transcript", transcript.trim());
    }
    formData.append("is_direct_recording", isDirectRecording ? "true" : "false");

    try {
      const data = await apiRequest<{
        extraction_id: string;
        transcript: string;
        decisions: string[];
        blockers: string[];
        tasks: ExtractedTaskItem[];
      }>("/api/ai/voice/transcribe-extract/", {
        method: "POST",
        body: formData,
      });

      setExtractionId(data.extraction_id);
      setTranscript(data.transcript);
      setDecisions(data.decisions || []);
      setBlockers(data.blockers || []);
      setExtractedTasks(data.tasks || []);
    } catch (err) {
      console.error("AI task extraction failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecordedAudioBlob(file);
    }
  };

  const handleUpdateTaskField = (index: number, field: keyof ExtractedTaskItem, value: any) => {
    setExtractedTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, [field]: value } : t))
    );
  };

  const handleRemoveTask = (index: number) => {
    setExtractedTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCommitTasks = async () => {
    if (extractedTasks.length === 0) return;
    setIsCommitting(true);

    try {
      await apiRequest("/api/ai/tasks/commit-extracted/", {
        method: "POST",
        body: JSON.stringify({
          tasks: extractedTasks,
          source_type: initialMessageId ? "chat_message" : "voice_extraction",
          source_id: initialMessageId ? initialMessageId.toString() : extractionId || "voice-note",
        }),
      });

      if (onTasksCommitted) onTasksCommitted();
      onClose();
    } catch (err) {
      console.error("Failed to commit extracted tasks", err);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>Voice & AI Task Extraction</span>
        </div>
      }
      description={
        <span>
          Record or transcribe audio. 🍽️ <strong className="font-bold">plate</strong> extracts commitments, matches workspace members, and quotes supporting evidence.
        </span>
      }
      maxWidth="3xl"
    >
      <div className="flex flex-col gap-6">
        {/* Step 1: Input selector (Record / Upload / Text) */}
        {extractedTasks.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-xl max-w-sm">
              <button
                onClick={() => setMode("record")}
                className={clsx(
                  "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                  mode === "record" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                <span className="line-clamp-1">Record Audio</span>
              </button>
              <button
                onClick={() => setMode("upload")}
                className={clsx(
                  "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                  mode === "upload" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                <span className="line-clamp-1">Upload File</span>
              </button>
              <button
                onClick={() => setMode("text")}
                className={clsx(
                  "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                  mode === "text" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                <span className="line-clamp-1">Paste Text</span>
              </button>
            </div>

            {/* Attribution toggle */}
            <label className="flex items-center gap-2.5 text-sm text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isDirectRecording}
                onChange={(e) => setIsDirectRecording(e.target.checked)}
                className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>
                I am the speaker in this recording (assign first-person commitments "I will..." to me)
              </span>
            </label>

            {mode === "record" && (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-neutral-50/70 shadow-[0px_0px_30px_rgba(0,0,0,0.08)] gap-4">
                {isRecording ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                      <Mic className="w-8 h-8 text-red-600" />
                    </div>
                    <span className="text-sm font-mono font-bold text-red-700">
                      Recording: {recordSeconds}s
                    </span>
                    <Button variant="danger" size="md" onClick={stopRecording}>
                      <Square className="w-4 h-4" />
                      <span>Stop Recording</span>
                    </Button>
                  </div>
                ) : recordedAudioBlob ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <span className="text-xs font-semibold text-neutral-800">
                      Audio recorded ({Math.round(recordedAudioBlob.size / 1024)} KB)
                    </span>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setRecordedAudioBlob(null)}>
                        Re-record
                      </Button>
                      <Button size="sm" onClick={handleProcessExtraction} isLoading={isProcessing}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Transcribe & Extract Tasks</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="lg" onClick={startRecording}>
                    <Mic className="w-4 h-4" />
                    <span>Start Recording</span>
                  </Button>
                )}
              </div>
            )}

            {mode === "upload" && (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-200 rounded-lg bg-neutral-50/50 gap-3">
                <Upload className="w-8 h-8 text-neutral-400" />
                <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700">
                  <span>Choose audio file (.webm, .mp3, .wav, .m4a)</span>
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </label>
                {recordedAudioBlob && (
                  <Button size="sm" onClick={handleProcessExtraction} isLoading={isProcessing}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Transcribe & Extract</span>
                  </Button>
                )}
              </div>
            )}

            {mode === "text" && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste meeting notes, speech transcript, or discussion..."
                  rows={5}
                  className="w-full text-xs p-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Button size="sm" onClick={handleProcessExtraction} isLoading={isProcessing} disabled={!transcript.trim()}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extract Tasks & Commitments</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review Extracted Tasks, Decisions, and Blockers */}
        {extractedTasks.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Decisions & Blockers Badges */}
            {(decisions.length > 0 || blockers.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
                {decisions.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Agreed Decisions
                    </span>
                    <ul className="text-xs text-neutral-800 list-disc list-inside space-y-1">
                      {decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {blockers.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                      Identified Blockers
                    </span>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                      {blockers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Tasks Table / Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Proposed Tasks for Review ({extractedTasks.length})
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Review and customize before committing to the board
                </span>
              </div>

              <div className="flex flex-col gap-3.5">
                {extractedTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)] flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <input
                        type="text"
                        value={t.title}
                        onChange={(e) => handleUpdateTaskField(idx, "title", e.target.value)}
                        className="text-sm font-bold text-neutral-900 flex-1 border-b border-transparent hover:border-neutral-200 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleRemoveTask(idx)}
                        className="text-neutral-400 hover:text-red-600 p-1.5 rounded-md hover:bg-neutral-100 flex-shrink-0"
                        title="Remove task"
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                      </button>
                    </div>

                    <textarea
                      value={t.description}
                      onChange={(e) => handleUpdateTaskField(idx, "description", e.target.value)}
                      rows={2}
                      className="text-sm text-neutral-700 p-2.5 rounded-lg border border-neutral-100 focus:outline-none focus:border-blue-500 resize-none"
                    />

                    {/* Metadata controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100">
                      {/* Assignee */}
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-neutral-400 font-medium">Assignee:</span>
                        <select
                          value={t.assignee_id || "unassigned"}
                          onChange={(e) =>
                            handleUpdateTaskField(
                              idx,
                              "assignee_id",
                              e.target.value === "unassigned" ? null : e.target.value
                            )
                          }
                          className="text-sm px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white"
                        >
                          <option value="unassigned">Unassigned (No Owner)</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.user.name} ({m.title || m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-neutral-400 font-medium">Priority:</span>
                        <select
                          value={t.priority}
                          onChange={(e) => handleUpdateTaskField(idx, "priority", e.target.value)}
                          className="text-sm px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Evidence Quote */}
                      {t.evidence_quote && (
                        <div
                          className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md italic ml-auto max-w-xs truncate"
                          title={`Evidence quote: "${t.evidence_quote}"`}
                        >
                          <MessageSquareQuote className="w-3.5 h-3.5 shrink-0 flex-shrink-0" />
                          <span className="truncate">"{t.evidence_quote}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commit Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExtractedTasks([]);
                  setRecordedAudioBlob(null);
                }}
              >
                Reset & Try Another
              </Button>
              <Button size="md" onClick={handleCommitTasks} isLoading={isCommitting}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit {extractedTasks.length} Tasks to Board</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

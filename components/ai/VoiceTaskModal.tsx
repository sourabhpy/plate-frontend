"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth, WorkspaceMember } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { isVideoFile } from "@/lib/file-validation";
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
  History,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Volume2,
  Copy,
  Check,
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

export interface VoiceExtractionHistoryItem {
  id: string;
  audio_url?: string | null;
  transcript: string;
  decisions: string[];
  blockers: string[];
  extracted_tasks: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    assignee_id?: string | null;
    suggested_assignee_name?: string | null;
    deadline?: string | null;
    evidence_quote?: string;
  }>;
  created_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCommitted?: () => void;
  initialTranscript?: string;
  initialMessageId?: number;
  initialAudioUrl?: string;
  initialAudioFileName?: string;
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen,
  onClose,
  onTasksCommitted,
  initialTranscript,
  initialMessageId,
  initialAudioUrl,
  initialAudioFileName,
}) => {
  const { members, activeWorkspace, user, isAdmin } = useAuth();
  const [modalTab, setModalTab] = useState<"extract" | "history">("extract");
  const [mode, setMode] = useState<"record" | "upload" | "text">("record");
  const [transcript, setTranscript] = useState(initialTranscript || "");
  const [isDirectRecording, setIsDirectRecording] = useState(true);

  // Audio Recording & Attachment State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | File | null>(null);
  const [audioSourceFileName, setAudioSourceFileName] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);

  // Extraction State
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTaskItem[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  // Admin History State
  const [history, setHistory] = useState<VoiceExtractionHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedVoiceIds, setExpandedVoiceIds] = useState<Set<string>>(new Set());
  const [committingVoiceId, setCommittingVoiceId] = useState<string | null>(null);
  const [committedVoiceSuccessId, setCommittedVoiceSuccessId] = useState<string | null>(null);
  const [copiedTranscriptId, setCopiedTranscriptId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!isAdmin || !activeWorkspace) return;
    setIsLoadingHistory(true);
    try {
      const data = await apiRequest<VoiceExtractionHistoryItem[]>("/api/ai/voice/history/");
      setHistory(data || []);
      if (data && data.length > 0) {
        setExpandedVoiceIds(new Set([data[0].id]));
      }
    } catch (err) {
      console.error("Failed to load voice extraction history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchHistory();
    }
  }, [isOpen, isAdmin, activeWorkspace?.id]);

  React.useEffect(() => {
    if (!isOpen) {
      if (audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      setRecordedAudioBlob(null);
      setAudioSourceFileName(null);
      setAudioPreviewUrl(null);
      setIsLoadingAudio(false);
      setAudioLoadError(null);
      setExtractedTasks([]);
      setDecisions([]);
      setBlockers([]);
      setTranscript("");
      setExtractionId(null);
      return;
    }

    if (initialAudioUrl) {
      setMode("upload");
      setIsLoadingAudio(true);
      setAudioLoadError(null);
      const fileName = initialAudioFileName || "voice_note.webm";
      setAudioSourceFileName(fileName);
      setAudioPreviewUrl(initialAudioUrl);

      const fetchUrl = initialAudioUrl.startsWith("http")
        ? initialAudioUrl
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${initialAudioUrl}`;

      const token = typeof window !== "undefined" ? localStorage.getItem("plate_access_token") : null;
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      fetch(fetchUrl, { headers })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to load audio (${res.status})`);
          }
          const blob = await res.blob();
          const file = new File([blob], fileName, {
            type: blob.type || "audio/webm",
          });
          setRecordedAudioBlob(file);
        })
        .catch((err) => {
          console.error("Failed to load initial audio:", err);
          setAudioLoadError("Could not automatically retrieve audio from message.");
        })
        .finally(() => {
          setIsLoadingAudio(false);
        });
    } else if (initialTranscript) {
      setTranscript(initialTranscript);
      setMode("text");
    } else {
      setMode("record");
    }
  }, [isOpen, initialAudioUrl, initialAudioFileName, initialTranscript]);

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
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        setAudioSourceFileName("voice_recording.webm");
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((p) => {
          if (p + 1 >= 60) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
            }
            if (timerRef.current) clearInterval(timerRef.current);
            return 60;
          }
          return p + 1;
        });
      }, 1000);
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
      if (recordedAudioBlob.size > 5 * 1024 * 1024) {
        alert("Audio file size exceeds the 5MB limit. Please provide a smaller audio file.");
        setIsProcessing(false);
        return;
      }
      formData.append(
        "audio",
        recordedAudioBlob,
        audioSourceFileName || (recordedAudioBlob instanceof File ? recordedAudioBlob.name : "recording.webm")
      );
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
      if (isAdmin) {
        fetchHistory();
      }
    } catch (err: any) {
      console.error("AI task extraction failed", err);
      alert(err.message || "Failed to transcribe and extract tasks. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      alert("Only one audio file can be added at a time.");
      if (e.target) e.target.value = "";
      return;
    }
    const file = files[0];
    if (isVideoFile(file)) {
      alert("Video files are not allowed for upload.");
      if (e.target) e.target.value = "";
      return;
    }
    const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_MEDIA_SIZE) {
      alert("Audio file size exceeds the 5MB limit. Please choose a file smaller than 5MB.");
      if (e.target) e.target.value = "";
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    const audioTest = new Audio();
    audioTest.src = tempUrl;
    audioTest.onloadedmetadata = () => {
      if (audioTest.duration > 60.5) {
        alert(
          `Audio exceeds the 1-minute limit (${Math.round(audioTest.duration)}s). Please choose an audio recording under 60 seconds.`
        );
        URL.revokeObjectURL(tempUrl);
        if (e.target) e.target.value = "";
        return;
      }
      setRecordedAudioBlob(file);
      setAudioSourceFileName(file.name);
      setAudioPreviewUrl(tempUrl);
      setAudioLoadError(null);
    };
    audioTest.onerror = () => {
      setRecordedAudioBlob(file);
      setAudioSourceFileName(file.name);
      setAudioPreviewUrl(tempUrl);
      setAudioLoadError(null);
    };
  };

  const handleClearAudio = () => {
    if (audioPreviewUrl && audioPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setRecordedAudioBlob(null);
    setAudioPreviewUrl(null);
    setAudioSourceFileName(null);
    setAudioLoadError(null);
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("plate:tasks_updated"));
      }
      onClose();
    } catch (err) {
      console.error("Failed to commit extracted tasks", err);
    } finally {
      setIsCommitting(false);
    }
  };

  const toggleExpandVoice = (id: string) => {
    setExpandedVoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyTranscript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTranscriptId(id);
    setTimeout(() => setCopiedTranscriptId(null), 2000);
  };

  const handleCommitHistoryTasks = async (item: VoiceExtractionHistoryItem) => {
    if (!item.extracted_tasks || item.extracted_tasks.length === 0) return;
    setCommittingVoiceId(item.id);
    try {
      await apiRequest("/api/ai/tasks/commit-extracted/", {
        method: "POST",
        body: JSON.stringify({
          tasks: item.extracted_tasks.map((t) => ({
            title: t.title,
            description: t.description || "",
            priority: t.priority || "medium",
            assignee_id: t.assignee_id || null,
            deadline: t.deadline || null,
            evidence_quote: t.evidence_quote || `From voice extraction ${item.id}`,
          })),
          source_type: "voice_extraction",
          source_id: item.id,
        }),
      });
      setCommittedVoiceSuccessId(item.id);
      if (onTasksCommitted) onTasksCommitted();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("plate:tasks_updated"));
      }
      setTimeout(() => setCommittedVoiceSuccessId(null), 3000);
    } catch (err) {
      console.error("Failed to commit tasks from history", err);
    } finally {
      setCommittingVoiceId(null);
    }
  };

  const renderHistoryView = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-600" />
          <span>Voice Extractions Archive ({history.length})</span>
        </span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (expandedVoiceIds.size === history.length) {
                setExpandedVoiceIds(new Set());
              } else {
                setExpandedVoiceIds(new Set(history.map((h) => h.id)));
              }
            }}
            className="text-xs text-neutral-500 hover:text-neutral-800 font-medium transition-colors"
          >
            {expandedVoiceIds.size === history.length ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {isLoadingHistory ? (
        <div className="p-10 rounded-2xl bg-neutral-50/70 flex flex-col items-center justify-center gap-3 text-neutral-500">
          <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-xs">Loading voice analysis history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-10 rounded-2xl bg-neutral-50/70 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <Mic className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-neutral-900">No Audio Analyses Yet</h4>
          <p className="text-xs text-neutral-500 max-w-sm">
            Transcribe voice recordings or audio files to extract commitments, decisions, and blockers.
          </p>
          <Button size="sm" onClick={() => setModalTab("extract")} className="mt-1">
            <Mic className="w-3.5 h-3.5" />
            <span>Record or Upload Audio</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 w-full">
          {history.map((item) => {
            const isExpanded = expandedVoiceIds.has(item.id);
            return (
              <div
                key={item.id}
                className="w-full shrink-0 flex-shrink-0 rounded-xl border border-neutral-200/80 bg-white overflow-hidden shadow-xs transition-all"
              >
                {/* Collapsed Header */}
                <div
                  onClick={() => toggleExpandVoice(item.id)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/70 transition-colors select-none"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-neutral-900 truncate">
                        {item.transcript
                          ? item.transcript.slice(0, 65) + (item.transcript.length > 65 ? "..." : "")
                          : "Voice Audio Analysis"}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {item.created_by && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{item.created_by.name || item.created_by.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Chevron */}
                  <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                    {item.audio_url && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        <span>Audio</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium">
                      {item.extracted_tasks?.length || 0} tasks
                    </span>
                    {item.decisions && item.decisions.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                        {item.decisions.length} decisions
                      </span>
                    )}
                    {item.blockers && item.blockers.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold">
                        {item.blockers.length} blockers
                      </span>
                    )}
                    <div className="p-1 text-neutral-400 hover:text-neutral-700">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Full Expanded Form and Details */}
                {isExpanded && (
                  <div className="p-4 pt-1 flex flex-col gap-4 border-t border-neutral-100 bg-neutral-50/30">
                    {/* Audio Player if audio_url exists */}
                    {item.audio_url && (
                      <div className="p-3 rounded-xl bg-white border border-neutral-200/70 flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Audio Recording</span>
                        </span>
                        <audio controls className="w-full h-9 rounded-lg" src={item.audio_url} />
                      </div>
                    )}

                    {/* Full Verbatim Transcript */}
                    {item.transcript && (
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquareQuote className="w-3.5 h-3.5 text-blue-600" />
                            <span>Full Verbatim Transcript</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyTranscript(item.id, item.transcript)}
                            className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 transition-colors"
                          >
                            {copiedTranscriptId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-semibold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap break-words">
                          {item.transcript}
                        </p>
                      </div>
                    )}

                    {/* Decisions */}
                    {item.decisions && item.decisions.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Decisions Reached ({item.decisions.length})
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {item.decisions.map((dec, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50/60 text-xs text-blue-900 border border-blue-100/60"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span>{dec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blockers */}
                    {item.blockers && item.blockers.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Blockers & Risks Flagged ({item.blockers.length})
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {item.blockers.map((blk, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/60 text-xs text-red-900 border border-red-100/60"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                              <span>{blk}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Tasks with commit button */}
                    {item.extracted_tasks && item.extracted_tasks.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                            Extracted Action Items ({item.extracted_tasks.length})
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleCommitHistoryTasks(item)}
                            isLoading={committingVoiceId === item.id}
                            disabled={committedVoiceSuccessId === item.id}
                            className={clsx(
                              "h-7 px-2.5 text-xs",
                              committedVoiceSuccessId === item.id &&
                                "bg-emerald-600 text-white hover:bg-emerald-600"
                            )}
                          >
                            {committedVoiceSuccessId === item.id ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Committed!</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Commit to Board</span>
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="flex flex-col gap-2">
                          {item.extracted_tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-white border border-neutral-200/70 flex flex-col gap-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-neutral-900">{task.title}</span>
                                <Badge variant={task.priority} size="sm">
                                  {task.priority}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-neutral-500 leading-normal">{task.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-neutral-400">
                                {task.suggested_assignee_name && (
                                  <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
                                    Assignee: {task.suggested_assignee_name}
                                  </span>
                                )}
                                {task.evidence_quote && (
                                  <span className="italic truncate max-w-md">
                                    "{task.evidence_quote}"
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <span>Voice & AI Task Extraction</span>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              Admin
            </span>
          )}
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
        {/* Admin Navigation Tab Switcher */}
        {isAdmin && (
          <div className="sticky -top-5 sm:-top-6 bg-white z-20 flex items-center gap-2 border-b border-neutral-100 pb-3 -mt-1 pt-1">
            <button
              type="button"
              onClick={() => setModalTab("extract")}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                modalTab === "extract"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>New Extraction</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModalTab("history");
                fetchHistory();
              }}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                modalTab === "history"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
            >
              <History className="w-4 h-4" />
              <span>Analysis History</span>
              {history.length > 0 && (
                <span
                  className={clsx(
                    "px-1.5 py-0.2 rounded-full text-[11px] font-bold",
                    modalTab === "history" ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                  )}
                >
                  {history.length}
                </span>
              )}
            </button>
          </div>
        )}

        {isAdmin && modalTab === "history" ? (
          renderHistoryView()
        ) : (
          <>
            {/* Step 1: Input selector (Record / Upload / Text) */}
        {extractedTasks.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-xl max-w-sm">
              <button
                onClick={() => setMode("record")}
                className={clsx(
                  "flex-1 py-1.5 text-sm justify-center font-semibold rounded-lg transition-colors",
                  mode === "record" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                Record Audio
              </button>
              <button
                onClick={() => setMode("upload")}
                className={clsx(
                  "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                  mode === "upload" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                Upload File
              </button>
              <button
                onClick={() => setMode("text")}
                className={clsx(
                  "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                  mode === "text" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                Paste Text
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
                    <span className="text-sm font-inter font-bold text-red-700">
                      Recording: {recordSeconds}s / 60s max
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
              <div className="flex flex-col gap-3">
                {isLoadingAudio ? (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 gap-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-neutral-600">
                      Attaching audio from message...
                    </span>
                  </div>
                ) : recordedAudioBlob || audioPreviewUrl ? (
                  <div className="flex flex-col p-5 border border-neutral-200 rounded-2xl bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.06)] gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Mic className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-neutral-900 truncate">
                              {audioSourceFileName || "Voice Note"}
                            </p>
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              {initialAudioUrl ? "From Chat" : "Audio Attached"}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {recordedAudioBlob
                              ? `${Math.round(recordedAudioBlob.size / 1024)} KB`
                              : "Audio ready for analysis"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAudio}
                        className="text-neutral-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                        title="Remove audio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {audioPreviewUrl && (
                      <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
                        <audio controls src={audioPreviewUrl} className="w-full h-8" />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                      <label className="cursor-pointer text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors">
                        <span>Replace file</span>
                        <input type="file" accept="audio/*" multiple={false} onChange={handleFileUpload} className="hidden" />
                      </label>
                      <Button
                        size="sm"
                        onClick={handleProcessExtraction}
                        isLoading={isProcessing}
                        disabled={isLoadingAudio || !recordedAudioBlob}
                        className="gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Transcribe & Extract Tasks</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 gap-3">
                    <Upload className="w-8 h-8 text-neutral-400" />
                    <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <span>Choose audio file (max 1 min, up to 5MB)</span>
                      <input type="file" accept="audio/*" multiple={false} onChange={handleFileUpload} className="hidden" />
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      Upload single audio recording (max 1 min & 5MB) to transcribe & extract commitments
                    </span>
                    {audioLoadError && (
                      <span className="text-xs text-red-500 font-medium">
                        {audioLoadError}
                      </span>
                    )}
                  </div>
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
                          <MessageSquareQuote className="w-3.5 h-3.5 flex-shrink-0" />
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
          </>
        )}
      </div>
    </Modal>
  );
};

"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { validateFileUpload } from "@/lib/file-validation";
import {
  FileText,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  History,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileSearch,
  Eye,
} from "lucide-react";
import { FileViewerModal } from "@/components/ui/FileViewerModal";
import clsx from "clsx";

interface DocumentAnalysisResult {
  id: string;
  file_name: string;
  summary: string;
  key_findings: string[];
  issues: string[];
  suggested_tasks: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
  }>;
}

export interface DocumentAnalysisHistoryItem {
  id: string;
  file_name: string;
  file_type: string;
  file_url?: string | null;
  extracted_text: string;
  summary: string;
  key_findings: string[];
  issues: string[];
  suggested_tasks: Array<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
  }>;
  created_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

interface DocumentAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCommitted?: () => void;
}

export const DocumentAnalyzerModal: React.FC<DocumentAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onTasksCommitted,
}) => {
  const { isAdmin, activeWorkspace } = useAuth();
  const [modalTab, setModalTab] = useState<"analyze" | "history">("analyze");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Admin History State
  const [history, setHistory] = useState<DocumentAnalysisHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());
  const [committingDocId, setCommittingDocId] = useState<string | null>(null);
  const [committedDocSuccessId, setCommittedDocSuccessId] = useState<string | null>(null);
  const [showRawTextIds, setShowRawTextIds] = useState<Set<string>>(new Set());
  const [viewingFile, setViewingFile] = useState<{
    url: string | null;
    name: string;
    type: string;
    rawContent?: string;
  } | null>(null);

  const fetchHistory = async () => {
    if (!isAdmin || !activeWorkspace) return;
    setIsLoadingHistory(true);
    try {
      const data = await apiRequest<DocumentAnalysisHistoryItem[]>("/api/ai/documents/history/");
      setHistory(data || []);
      if (data && data.length > 0) {
        setExpandedDocIds(new Set([data[0].id]));
      }
    } catch (err) {
      console.error("Failed to load document analysis history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchHistory();
    }
    if (!isOpen) {
      setSelectedFile(null);
      setResult(null);
      setModalTab("analyze");
    }
  }, [isOpen, isAdmin, activeWorkspace?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setAnalysisError("Only one document can be analyzed at a time.");
      if (e.target) e.target.value = "";
      return;
    }
    const file = files[0];
    const validation = validateFileUpload(file, { label: "Document" });
    if (!validation.isValid) {
      setAnalysisError(validation.error || "Invalid document file.");
      if (e.target) e.target.value = "";
      return;
    }
    setAnalysisError(null);
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setAnalysisError("Document size exceeds the 5MB limit. Please upload a file under 5MB.");
      return;
    }
    setAnalysisError(null);
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const data = await apiRequest<DocumentAnalysisResult>("/api/ai/documents/analyze/", {
        method: "POST",
        body: formData,
      });
      setResult(data);
      if (isAdmin) {
        fetchHistory();
      }
    } catch (err: any) {
      console.error("Document analysis failed", err);
      setAnalysisError(err.message || "Failed to analyze document.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommitTasks = async () => {
    if (!result || result.suggested_tasks.length === 0) return;
    setIsCommitting(true);

    try {
      await apiRequest("/api/ai/tasks/commit-extracted/", {
        method: "POST",
        body: JSON.stringify({
          tasks: result.suggested_tasks.map((t) => ({
            ...t,
            assignee_id: null,
            evidence_quote: `From ${result.file_name}`,
          })),
          source_type: "document_analysis",
          source_id: result.id,
        }),
      });
      if (onTasksCommitted) onTasksCommitted();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("plate:tasks_updated"));
      }
      onClose();
    } catch (err) {
      console.error("Failed to commit document tasks", err);
    } finally {
      setIsCommitting(false);
    }
  };

  const toggleExpandDoc = (id: string) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleShowRawText = (id: string) => {
    setShowRawTextIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCommitHistoryTasks = async (item: DocumentAnalysisHistoryItem) => {
    if (!item.suggested_tasks || item.suggested_tasks.length === 0) return;
    setCommittingDocId(item.id);
    try {
      await apiRequest("/api/ai/tasks/commit-extracted/", {
        method: "POST",
        body: JSON.stringify({
          tasks: item.suggested_tasks.map((t) => ({
            ...t,
            assignee_id: null,
            evidence_quote: `From ${item.file_name}`,
          })),
          source_type: "document_analysis",
          source_id: item.id,
        }),
      });
      setCommittedDocSuccessId(item.id);
      if (onTasksCommitted) onTasksCommitted();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("plate:tasks_updated"));
      }
      setTimeout(() => setCommittedDocSuccessId(null), 3000);
    } catch (err) {
      console.error("Failed to commit tasks from history", err);
    } finally {
      setCommittingDocId(null);
    }
  };

  const renderHistoryView = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
          <FileSearch className="w-3.5 h-3.5 text-blue-600" />
          <span>Document Analyses Archive ({history.length})</span>
        </span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (expandedDocIds.size === history.length) {
                setExpandedDocIds(new Set());
              } else {
                setExpandedDocIds(new Set(history.map((h) => h.id)));
              }
            }}
            className="text-xs text-neutral-500 hover:text-neutral-800 font-medium transition-colors"
          >
            {expandedDocIds.size === history.length ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {isLoadingHistory ? (
        <div className="p-10 rounded-2xl bg-neutral-50/70 flex flex-col items-center justify-center gap-3 text-neutral-500">
          <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-xs">Loading document analysis history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-10 rounded-2xl bg-neutral-50/70 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-neutral-900">No Document Analyses Yet</h4>
          <p className="text-xs text-neutral-500 max-w-sm">
            Upload PDFs, architectural design specs, or text documents to generate automatic summaries and tasks.
          </p>
          <Button size="sm" onClick={() => setModalTab("analyze")} className="mt-1">
            <Upload className="w-3.5 h-3.5" />
            <span>Analyze First Document</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 w-full">
          {history.map((item) => {
            const isExpanded = expandedDocIds.has(item.id);
            const isShowingRaw = showRawTextIds.has(item.id);
            return (
              <div
                key={item.id}
                className="w-full shrink-0 flex-shrink-0 rounded-xl border border-neutral-200/80 bg-white overflow-hidden shadow-xs transition-all"
              >
                {/* Collapsed Header */}
                <div
                  onClick={() => toggleExpandDoc(item.id)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/70 transition-colors select-none"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold text-neutral-900 truncate">
                        {item.file_name}
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
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium">
                      {item.suggested_tasks?.length || 0} tasks
                    </span>
                    {item.issues && item.issues.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold">
                        {item.issues.length} risks
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
                    {/* Executive Summary */}
                    {item.summary && (
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70 flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Executive Summary
                        </span>
                        <p className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
                          {item.summary}
                        </p>
                      </div>
                    )}

                    {/* Key Findings & Flagged Risks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.key_findings && item.key_findings.length > 0 && (
                        <div className="p-3 rounded-xl bg-white border border-neutral-200/70 flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Key Findings ({item.key_findings.length})</span>
                          </span>
                          <ul className="text-xs text-neutral-700 space-y-1 list-disc list-inside">
                            {item.key_findings.map((f, idx) => (
                              <li key={idx}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.issues && item.issues.length > 0 && (
                        <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Flagged Risks ({item.issues.length})</span>
                          </span>
                          <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                            {item.issues.map((iss, idx) => (
                              <li key={idx}>{iss}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Suggested Tasks with commit button */}
                    {item.suggested_tasks && item.suggested_tasks.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                            Suggested Action Items ({item.suggested_tasks.length})
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleCommitHistoryTasks(item)}
                            isLoading={committingDocId === item.id}
                            disabled={committedDocSuccessId === item.id}
                            className={clsx(
                              "h-7 px-2.5 text-xs",
                              committedDocSuccessId === item.id &&
                                "bg-emerald-600 text-white hover:bg-emerald-600"
                            )}
                          >
                            {committedDocSuccessId === item.id ? (
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
                          {item.suggested_tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-white border border-neutral-200/70 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-neutral-900 block truncate">
                                  {task.title}
                                </span>
                                <span className="text-neutral-500 line-clamp-1">{task.description}</span>
                              </div>
                              <Badge variant={task.priority} size="sm">
                                {task.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document footer with In-App Viewing & Download */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingFile({
                              url: item.file_url || null,
                              name: item.file_name,
                              type: item.file_type,
                              rawContent: item.extracted_text,
                            })
                          }
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View In-App</span>
                        </button>
                        {item.file_url && (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-400 hover:text-neutral-700 p-1 rounded transition-colors"
                            title="Open raw file in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {item.extracted_text && (
                        <button
                          type="button"
                          onClick={() => toggleShowRawText(item.id)}
                          className="text-neutral-500 hover:text-neutral-800 underline text-xs"
                        >
                          {isShowingRaw ? "Hide extracted raw text" : "View extracted raw text"}
                        </button>
                      )}
                    </div>

                    {/* Collapsible raw text */}
                    {isShowingRaw && item.extracted_text && (
                      <div className="p-3 rounded-lg bg-neutral-900 text-neutral-100 text-[11px] font-mono whitespace-pre-wrap break-words">
                        {item.extracted_text}
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
          <FileText className="w-5 h-5 text-neutral-800 flex-shrink-0" />
          <span>AI Document & Image Analysis</span>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              Admin
            </span>
          )}
        </div>
      }
      description={
        <span>
          Upload PDFs, screenshots, or text specs. 🍽️ <strong className="font-bold">plate</strong> extracts insights, flags risks, and suggests action items.
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
              onClick={() => setModalTab("analyze")}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                modalTab === "analyze"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyze Document</span>
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
            {/* Upload Drop Area */}
            {!result && (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-neutral-50/70 shadow-[0px_0px_30px_rgba(0,0,0,0.08)] gap-3.5">
                <Upload className="w-9 h-9 text-neutral-400 flex-shrink-0" />
                <label className="cursor-pointer text-sm font-semibold text-neutral-500 hover:text-neutral-700">
                  <span className="line-clamp-1">{selectedFile ? selectedFile.name : "Select PDF, image, or document"}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                    multiple={false}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-neutral-400">
                  PDF, Screenshots, PNG, JPG, Text up to 5MB (single file)
                </span>

                {analysisError && (
                  <span className="text-xs text-red-500 font-medium">
                    {analysisError}
                  </span>
                )}

                {selectedFile && (
                  <Button size="md" onClick={handleAnalyze} isLoading={isAnalyzing} className="mt-2 shadow-xs">
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">Analyze Document</span>
                  </Button>
                )}

                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-2">
                  <ShieldCheck className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  <span>Safety Sandboxed: Document text is parsed as untrusted data</span>
                </div>
              </div>
            )}

            {/* Results View */}
            {result && (
              <div className="flex flex-col gap-5">
                {/* Summary */}
                <div className="p-5 rounded-2xl bg-neutral-50/80 shadow-[0px_0px_30px_rgba(0,0,0,0.06)] flex flex-col gap-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Executive Summary: {result.file_name}
                  </span>
                  <p className="text-sm text-neutral-800 leading-relaxed">{result.summary}</p>
                </div>

                {/* Findings & Issues */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)]">
                    <span className="text-sm font-bold text-neutral-900 mb-2.5 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Key Findings</span>
                    </span>
                    <ul className="text-sm text-neutral-700 space-y-1.5 list-disc list-inside">
                      {result.key_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-red-50/40 shadow-[0px_0px_30px_rgba(239,68,68,0.1)]">
                    <span className="text-sm font-bold text-red-700 mb-2.5 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>Flagged Risks & Blockers</span>
                    </span>
                    <ul className="text-sm text-red-800 space-y-1.5 list-disc list-inside">
                      {result.issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Suggested Follow-up Tasks */}
                {result.suggested_tasks.length > 0 && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-neutral-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Suggested Action Items ({result.suggested_tasks.length})
                      </h4>
                      <span className="text-xs text-neutral-400">
                        One-click add to workspace board
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {result.suggested_tasks.map((task, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 text-sm"
                        >
                          <div>
                            <span className="font-semibold text-neutral-900 block leading-snug">{task.title}</span>
                            <span className="text-sm text-neutral-500">{task.description}</span>
                          </div>
                          <Badge variant={task.priority} size="sm">
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResult(null);
                      setSelectedFile(null);
                    }}
                  >
                    Upload Another Document
                  </Button>

                  {result.suggested_tasks.length > 0 && (
                    <Button size="md" onClick={handleCommitTasks} isLoading={isCommitting}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Commit Suggested Tasks to Board</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* In-App Document Viewer Modal */}
      <FileViewerModal
        isOpen={Boolean(viewingFile)}
        onClose={() => setViewingFile(null)}
        fileUrl={viewingFile?.url || null}
        fileName={viewingFile?.name || "Document"}
        fileType={viewingFile?.type || ""}
        rawContent={viewingFile?.rawContent || ""}
      />
    </Modal>
  );
};

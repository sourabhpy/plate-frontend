"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  Clock,
  User,
  Plus,
  Lock,
  Sparkles,
  FileSearch,
  Eye,
} from "lucide-react";
import { FileViewerModal } from "@/components/ui/FileViewerModal";
import clsx from "clsx";

export interface DocumentAnalysisItem {
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

interface DocumentsViewProps {
  onOpenDocModal: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onOpenDocModal }) => {
  const { isAdmin, activeWorkspace } = useAuth();
  const [history, setHistory] = useState<DocumentAnalysisItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [committingId, setCommittingId] = useState<string | null>(null);
  const [committedSuccessId, setCommittedSuccessId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{
    url: string | null;
    name: string;
    type: string;
    rawContent?: string;
  } | null>(null);

  const fetchHistory = async () => {
    if (!isAdmin || !activeWorkspace) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<DocumentAnalysisItem[]>("/api/ai/documents/history/");
      setHistory(data || []);
      // Expand the most recent document by default if exists
      if (data && data.length > 0) {
        setExpandedIds(new Set([data[0].id]));
      }
    } catch (err) {
      console.error("Failed to load document analysis history", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isAdmin, activeWorkspace?.id]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCommitTasks = async (item: DocumentAnalysisItem) => {
    if (item.suggested_tasks.length === 0) return;
    setCommittingId(item.id);
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
      setCommittedSuccessId(item.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("plate:tasks_updated"));
      }
      setTimeout(() => setCommittedSuccessId(null), 3000);
    } catch (err) {
      console.error("Failed to commit tasks from history", err);
    } finally {
      setCommittingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Document Analysis</h1>
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                Admin Access
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Upload PDFs, design screenshots, and project specs. 🍽️ <strong className="font-bold">plate</strong> extracts summaries, risks, and proposed tasks.
          </p>
        </div>

        <Button size="sm" onClick={onOpenDocModal} className="shadow-xs flex-shrink-0">
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">Upload Document</span>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="my-6">
        {isAdmin ? (
          /* Admin View: Real Dynamic Document Analysis History */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-blue-600" />
                <span>Analysis History ({history.length})</span>
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (expandedIds.size === history.length) {
                      setExpandedIds(new Set());
                    } else {
                      setExpandedIds(new Set(history.map((h) => h.id)));
                    }
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-800 font-medium transition-colors"
                >
                  {expandedIds.size === history.length ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="p-12 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center gap-3 text-neutral-500">
                <Sparkles className="w-6 h-6 text-blue-600 animate-spin" />
                <span className="text-sm">Loading document history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">No Documents Analyzed Yet</h3>
                <p className="text-sm text-neutral-500 max-w-sm">
                  Upload an architecture spec, PRD, or screenshot to automatically extract tasks, summaries, and risk analyses.
                </p>
                <Button size="sm" onClick={onOpenDocModal} className="mt-2">
                  <Upload className="w-4 h-4" />
                  <span>Analyze First Document</span>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {history.map((item) => {
                  const isExpanded = expandedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.08)] transition-all overflow-hidden"
                    >
                      {/* Collapsed Header / Trigger */}
                      <div
                        onClick={() => toggleExpand(item.id)}
                        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/60 transition-colors select-none"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <h3 className="text-base font-bold text-neutral-900 truncate">
                              {item.file_name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(item.created_at).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                              {item.created_by && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  <span>{item.created_by.name || item.created_by.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Badges & Chevron */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-100/70 text-neutral-700 text-xs font-medium">
                            {item.suggested_tasks.length} tasks
                          </span>
                          {item.issues.length > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold">
                              {item.issues.length} risks
                            </span>
                          )}
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-1"
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Full Expandable Form and Details */}
                      {isExpanded && (
                        <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 flex flex-col gap-5 border-t border-neutral-100 animate-in fade-in duration-150">
                          {/* Summary */}
                          {item.summary && (
                            <div className="p-4 rounded-xl bg-neutral-50 text-neutral-800 flex flex-col gap-1.5">
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                Executive Summary
                              </span>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.summary}</p>
                            </div>
                          )}

                          {/* Key Findings */}
                          {item.key_findings.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                Key Findings ({item.key_findings.length})
                              </span>
                              <div className="grid grid-cols-1 gap-2">
                                {item.key_findings.map((f, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 text-sm text-neutral-800"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{f}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Issues & Blockers */}
                          {item.issues.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                Identified Risks & Issues ({item.issues.length})
                              </span>
                              <div className="grid grid-cols-1 gap-2">
                                {item.issues.map((issue, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 text-sm text-amber-900"
                                  >
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{issue}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Suggested Tasks */}
                          {item.suggested_tasks.length > 0 && (
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                  Suggested Tasks ({item.suggested_tasks.length})
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => handleCommitTasks(item)}
                                  isLoading={committingId === item.id}
                                  disabled={committedSuccessId === item.id}
                                  className={clsx(
                                    "h-8 px-3 text-xs",
                                    committedSuccessId === item.id && "bg-emerald-600 text-white hover:bg-emerald-600"
                                  )}
                                >
                                  {committedSuccessId === item.id ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Committed to Board!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Commit All Tasks</span>
                                    </>
                                  )}
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {item.suggested_tasks.map((task, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-xl bg-neutral-50 flex flex-col justify-between gap-2"
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-neutral-900 text-sm leading-snug">
                                          {task.title}
                                        </span>
                                        <span
                                          className={clsx(
                                            "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0",
                                            task.priority === "urgent"
                                              ? "bg-red-50 text-red-700"
                                              : task.priority === "high"
                                              ? "bg-amber-50 text-amber-800"
                                              : task.priority === "medium"
                                              ? "bg-blue-50 text-blue-700"
                                              : "bg-neutral-100 text-neutral-600"
                                          )}
                                        >
                                          {task.priority}
                                        </span>
                                      </div>
                                      {task.description && (
                                        <p className="text-xs text-neutral-500 leading-relaxed">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Raw Extracted Text Viewer (Collapsible) */}
                          {item.extracted_text && (
                            <details className="group/text rounded-xl bg-neutral-50/70 p-3 text-xs text-neutral-600">
                              <summary className="font-semibold cursor-pointer text-neutral-700 hover:text-neutral-900 select-none flex items-center justify-between">
                                <span>View Extracted Plain Text ({item.extracted_text.length} characters)</span>
                              </summary>
                              <div className="mt-2.5 p-3 rounded-lg bg-white text-neutral-800 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                                {item.extracted_text}
                              </div>
                            </details>
                          )}

                          {/* In-App File Viewer & Download Actions */}
                          <div className="pt-2 flex items-center justify-end gap-2">
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Document In-App</span>
                            </button>
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                                title="Open raw file URL in new tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Non-Admin View: Access Control Notice */
          <div className="p-8 sm:p-12 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">AI Operation History is Restricted</h3>
            <p className="text-sm text-neutral-500 max-w-md">
              Detailed document analysis records, historical summaries, and risk logs are only visible to workspace administrators.
            </p>
            <Button size="sm" onClick={onOpenDocModal} className="mt-2">
              <Upload className="w-4 h-4" />
              <span>Analyze a New Document</span>
            </Button>
          </div>
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
    </div>
  );
};

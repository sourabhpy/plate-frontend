"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api";
import {
  FileText,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Plus,
} from "lucide-react";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const data = await apiRequest<DocumentAnalysisResult>("/api/ai/documents/analyze/", {
        method: "POST",
        body: formData,
      });
      setResult(data);
    } catch (err) {
      console.error("Document analysis failed", err);
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
      onClose();
    } catch (err) {
      console.error("Failed to commit document tasks", err);
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
          <FileText className="w-5 h-5 text-neutral-800 flex-shrink-0" />
          <span>AI Document & Image Analysis</span>
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
        {/* Upload Drop Area */}
        {!result && (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-neutral-50/70 shadow-[0px_0px_30px_rgba(0,0,0,0.08)] gap-3.5">
            <Upload className="w-9 h-9 text-neutral-400 flex-shrink-0" />
            <label className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700">
              <span className="line-clamp-1">{selectedFile ? selectedFile.name : "Select PDF, image, or document"}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <span className="text-xs text-neutral-400">
              PDF, Screenshots, PNG, JPG, Text up to 20MB
            </span>

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
      </div>
    </Modal>
  );
};

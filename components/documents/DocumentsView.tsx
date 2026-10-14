"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FileText, Plus, Upload, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

interface DocumentsViewProps {
  onOpenDocModal: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onOpenDocModal }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Document Analysis</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Upload PDFs, design screenshots, and project specs. 🍽️ <strong className="font-bold">plate</strong> extracts summaries, risks, and proposed tasks.
          </p>
        </div>

        <Button size="sm" onClick={onOpenDocModal} className="shadow-xs flex-shrink-0">
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">Upload Document</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
        <div className="p-6 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)] flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-neutral-700 flex-shrink-0" />
            <h3 className="text-base font-bold text-neutral-900">Sprint 14 Architecture Spec.pdf</h3>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Covers the architectural breakdown of the 2-second incremental HTTP polling protocol, PostgreSQL database schema, and Gemini voice task extraction pipeline.
          </p>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <Badge variant="blue" size="sm">Analyzed</Badge>
            <span className="text-xs text-neutral-400 font-mono">3 suggested tasks committed</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)] flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-neutral-700 flex-shrink-0" />
            <h3 className="text-base font-bold text-neutral-900">Q4 Security Policy & Isolation.pdf</h3>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Specifies object-level permission enforcement ensuring private DMs remain strictly confidential between conversation participants, with zero leakage to workspace admins.
          </p>
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <Badge variant="done" size="sm">Indexed in Memory</Badge>
            <span className="text-xs text-neutral-400 font-mono">1 blocker identified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

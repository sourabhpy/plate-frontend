"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Search,
  MessageSquare,
  FileText,
  Kanban,
  ExternalLink,
  BookOpen,
  RefreshCw,
  HelpCircle,
} from "lucide-react";

interface MemoryCitation {
  source_type: string;
  source_id: string;
  title: string;
  score: number;
}

export const TeamMemoryView: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<MemoryCitation[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  const sampleQuestions = [
    "What did we decide in the last planning discussion?",
    "Why was a particular task postponed?",
    "What commitments did the team make?",
    "What is Marcus currently working on?",
    "Why are we using 2-second HTTP polling instead of WebSockets?",
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q || isLoading) return;

    setQuestion(q);
    setIsLoading(true);
    setAnswer(null);
    setCitations([]);

    try {
      const res = await apiRequest<{
        answer: string;
        citations: MemoryCitation[];
      }>("/api/ai/memory/ask/", {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });
      setAnswer(res.answer);
      setCitations(res.citations || []);
    } catch (err) {
      console.error("Failed to query team memory", err);
      setAnswer("An error occurred while querying team memory. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchIndex = async () => {
    setIsIndexing(true);
    setIndexMessage(null);
    try {
      const res = await apiRequest<{ message: string; indexed_count: number }>(
        "/api/ai/memory/index-batch/",
        { method: "POST" }
      );
      setIndexMessage(res.message);
    } catch (err) {
      console.error("Failed to batch index", err);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950">Team Memory</h1>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              RAG + Authoritative DB
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Ask natural language questions about past decisions, discussions, commitments, and current assignments.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleBatchIndex}
          isLoading={isIndexing}
          className="self-start md:self-auto text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-index Workspace</span>
        </Button>
      </div>

      {indexMessage && (
        <div className="my-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {indexMessage}
        </div>
      )}

      {/* Query Composer */}
      <div className="my-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative flex items-center"
        >
          <Search className="w-4 h-4 text-neutral-400 absolute left-4" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about team decisions, postponed tasks, or member workload..."
            className="w-full h-12 pl-11 pr-24 text-sm bg-white rounded-lg border border-neutral-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-400"
          />
          <Button
            size="sm"
            type="submit"
            isLoading={isLoading}
            disabled={!question.trim()}
            className="absolute right-2"
          >
            Ask Plate
          </Button>
        </form>

        {/* Suggested Queries Pills */}
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">
            Try:
          </span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleAsk(sq)}
              className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition-colors text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Answer Output */}
      {isLoading && (
        <div className="p-8 border border-neutral-200 rounded-lg bg-neutral-50/50 flex flex-col items-center justify-center gap-3 text-neutral-500 animate-pulse">
          <Sparkles className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-xs font-medium">
            Synthesizing authoritative database records & historical vector memory...
          </span>
        </div>
      )}

      {answer && !isLoading && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-lg border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-neutral-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Plate Answer</span>
            </div>
            <div className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
              {answer}
            </div>
          </div>

          {/* Citations & Evidence */}
          {citations.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Supporting Evidence & Sources ({citations.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {c.source_type === "message" ? (
                        <MessageSquare className="w-4 h-4 text-neutral-400 shrink-0" />
                      ) : c.source_type === "task" ? (
                        <Kanban className="w-4 h-4 text-neutral-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <span className="font-semibold text-neutral-900 truncate">{c.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0 ml-2">
                      score: {c.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

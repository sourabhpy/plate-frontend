"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { FullscreenMobileSearch } from "@/components/ui/FullscreenMobileSearch";
import {
  Sparkles,
  Search,
  MessageSquare,
  FileText,
  Kanban,
  RefreshCw,
  X,
  ArrowRightIcon,
} from "lucide-react";
import clsx from "clsx";

interface CitationItem {
  source_type: "message" | "task" | "document";
  id: string | number;
  title: string;
  snippet?: string;
  score: number;
}

interface AskMemoryResponse {
  question: string;
  answer: string;
  citations: CitationItem[];
}

export const TeamMemoryView: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const sampleQuestions = [
    "What are our technical commitments for this sprint?",
    "Why did we choose PostgreSQL over MongoDB?",
    "What tasks are currently assigned to Elena?",
    "What security constraints were decided for Direct Messages?",
  ];

  const handleAsk = async (queryToAsk?: string) => {
    const q = (queryToAsk || question).trim();
    if (!q || !activeWorkspace) return;

    if (queryToAsk) setQuestion(queryToAsk);
    setIsLoading(true);
    setAnswer(null);
    setCitations([]);

    try {
      const res = await apiRequest<AskMemoryResponse>("/api/ai/ask-memory/", {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });
      setAnswer(res.answer);
      setCitations(res.citations || []);
    } catch (err: any) {
      console.error("Failed to query memory", err);
      setAnswer("Sorry, I could not synthesize an answer from team memory at this moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchIndex = async () => {
    if (!activeWorkspace) return;
    setIsIndexing(true);
    setIndexMessage(null);
    try {
      const res = await apiRequest<{ status: string; total_embedded: number }>(
        "/api/ai/batch-index/",
        { method: "POST" }
      );
      setIndexMessage(`Successfully indexed ${res.total_embedded} records into team memory.`);
    } catch (err) {
      console.error("Failed to batch index", err);
    } finally {
      setIsIndexing(false);
    }
  };

  const questionChips = sampleQuestions.map((sq, i) => ({
    id: `chip-${i}`,
    label: sq,
    active: question === sq,
    onClick: () => {
      setQuestion(sq);
      handleAsk(sq);
      setIsMobileSearchOpen(false);
    },
  }));

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Team Memory</h1>
            <span className="text-xs font-inter uppercase px-1.5 py-0.5 rounded-md font-bold bg-blue-500 text-white border">
              RAG + Authoritative DB
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            Ask natural language questions about past decisions, discussions, commitments, and current assignments.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleBatchIndex}
          isLoading={isIndexing}
          className="self-start md:self-auto shadow-xs flex-shrink-0"
        >
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">Re-index Workspace</span>
        </Button>
      </div>

      {indexMessage && (
        <div className="my-4 p-4 rounded-xl bg-emerald-50 text-sm text-emerald-800 shadow-[0px_0px_20px_rgba(16,185,129,0.08)]">
          {indexMessage}
        </div>
      )}

      {/* Query Composer (Desktop & Mobile) */}
      <div className="my-6">
        {/* Mobile search trigger button */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)] text-left text-neutral-500 transition-colors"
          >
            <div className="flex items-center gap-3 truncate">
              <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <span className="text-sm line-clamp-1">
                {question || "Ask about decisions, workload, tech stack..."}
              </span>
            </div>
            <span className="text-xs font-bold text-black flex-shrink-0 ml-2">
              <ArrowRightIcon size={20} />
            </span>
          </button>
        </div>

        {/* Desktop query input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative hidden md:flex items-center rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)] overflow-hidden"
        >
          <Search className="w-5 h-5 text-neutral-400 absolute left-4 flex-shrink-0 pointer-events-none" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about team decisions, postponed tasks, or member workload..."
            className="w-full h-14 pl-12 pr-36 text-base focus:outline-black rounded-2xl bg-white placeholder:text-neutral-400"
          />
          <Button
            size="sm"
            type="submit"
            isLoading={isLoading}
            disabled={!question.trim()}
            className="absolute bg-white text-black border-none hover:bg-white right-3"
          >
            <span className="line-clamp-1">
              <ArrowRightIcon size={20} />
            </span>
          </Button>
        </form>

        {/* Suggested Queries Pills */}
        <div className="flex flex-wrap gap-2 mt-3.5 items-center">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-1">
            Try:
          </span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAsk(sq)}
              className="text-xs px-3.5 py-1.5 rounded-full bg-white shadow-[0px_0px_20px_rgba(0,0,0,0.06)] hover:bg-neutral-50 text-neutral-700 transition-colors text-left"
            >
              <span className="line-clamp-1">{sq}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Answer Output */}
      {isLoading && (
        <div className="p-8 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center gap-3 text-neutral-600 animate-pulse my-6">
          <Sparkles className="w-7 h-7 text-blue-600 animate-spin flex-shrink-0" />
          <span className="text-sm font-medium text-center">
            Synthesizing authoritative database records & historical vector memory...
          </span>
        </div>
      )}

      {answer && !isLoading && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200 my-6">
          <div className="p-6 sm:p-7 rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.1)] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                <strong className="font-bold">plate</strong> Answer
              </span>
            </div>
            <div className="text-sm sm:text-base text-neutral-800 leading-relaxed whitespace-pre-wrap">
              {answer}
            </div>
          </div>

          {/* Citations & Evidence */}
          {citations.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                Supporting Evidence & Sources ({citations.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.08)] flex items-center justify-between text-sm gap-2"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {c.source_type === "message" ? (
                        <MessageSquare className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      ) : c.source_type === "task" ? (
                        <Kanban className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-neutral-900 truncate">{c.title}</span>
                    </div>
                    <span className="text-xs font-inter text-neutral-400 flex-shrink-0 ml-2">
                      score: {c.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Search Input on Mobile */}
      <FullscreenMobileSearch
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        value={question}
        onChange={setQuestion}
        placeholder="Ask about team decisions, postponed tasks..."
        chips={questionChips}
        onSubmit={() => {
          handleAsk();
          setIsMobileSearchOpen(false);
        }}
        submitButtonText="Ask 🍽️ plate"
      >
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Quick Suggestions
          </span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuestion(sq);
                handleAsk(sq);
                setIsMobileSearchOpen(false);
              }}
              className="p-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-sm font-medium text-neutral-800 text-left transition-colors flex items-center justify-between"
            >
              <span className="line-clamp-2">{sq}</span>
              <Search className="w-4 h-4 text-neutral-400 flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </FullscreenMobileSearch>
    </div>
  );
};

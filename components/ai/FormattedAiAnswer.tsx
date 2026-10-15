"use client";

import React from "react";
import {
  CheckCircle2,
  Calendar,
  User,
  Shield,
  Code,
  Palette,
  Wrench,
  Layers,
  Database,
  FileText,
  Mic,
  Flame,
  Clock,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

interface FormattedAiAnswerProps {
  content: string;
}

export const FormattedAiAnswer: React.FC<FormattedAiAnswerProps> = ({ content }) => {
  if (!content) return null;

  const rawLines = content.split("\n");

  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inProgressNote = false;
  let inSources = false;
  let progressNoteIntro = "";
  let progressNoteItems: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(renderBulletList(currentList, blocks.length));
      currentList = [];
    }
  };

  const flushProgressNote = () => {
    if (inProgressNote) {
      blocks.push(
        <div
          key={`progress-note-${blocks.length}`}
          className="my-4 p-4.5 rounded-2xl bg-emerald-50/60 text-emerald-950 flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Completed Progress This Sprint</span>
          </div>
          {progressNoteIntro && (
            <p className="text-xs sm:text-sm text-emerald-800/90 leading-relaxed">
              {progressNoteIntro}
            </p>
          )}
          {progressNoteItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {progressNoteItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-white/90 text-xs sm:text-sm text-neutral-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{cleanBulletText(item)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      inProgressNote = false;
      progressNoteIntro = "";
      progressNoteItems = [];
    }
  };

  const cleanBulletText = (text: string) => {
    return text.replace(/^[\*\-]\s+/, "").replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    if (!line) {
      if (inProgressNote) {
        // continue collecting
      } else {
        flushList();
      }
      continue;
    }

    // Divider
    if (line === "---" || line === "***" || line === "___") {
      flushList();
      flushProgressNote();
      blocks.push(
        <div key={`divider-${i}`} className="my-5 h-1 w-full rounded-full bg-neutral-100/70" />
      );
      continue;
    }

    // Progress Note block detector
    if (line.toLowerCase().includes("note on progress") || line.toLowerCase().includes("progress note")) {
      flushList();
      inProgressNote = true;
      continue;
    }

    if (inProgressNote) {
      if (line.startsWith("*") || line.startsWith("-")) {
        progressNoteItems.push(line);
      } else if (line.toLowerCase().startsWith("**sources") || line.startsWith("###")) {
        flushProgressNote();
        // Fall through to process sources or header
      } else {
        progressNoteIntro = line;
        continue;
      }
      if (inProgressNote) continue;
    }

    // Sources block detector
    if (line.toLowerCase().startsWith("**sources") || line.toLowerCase().startsWith("sources:")) {
      flushList();
      flushProgressNote();
      inSources = true;
      continue;
    }

    if (inSources) {
      if (line.startsWith("*") || line.startsWith("-")) {
        blocks.push(renderSourceItem(line, i));
      } else {
        inSources = false;
        // fall through
      }
      if (inSources) continue;
    }

    // Headings (###, ##, #)
    if (line.startsWith("### ")) {
      flushList();
      flushProgressNote();
      const title = line.replace(/^###\s+/, "");
      blocks.push(
        <div key={`h3-${i}`} className="mt-6 mb-2.5 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
            {title}
          </h3>
        </div>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      flushProgressNote();
      const title = line.replace(/^##\s+/, "");
      blocks.push(
        <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold text-neutral-900 mt-6 mb-2.5 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>{title}</span>
        </h2>
      );
      continue;
    }

    // Category Subheadings: **AI & Engineering**, **UI/UX & Design**, **Process & Maintenance**
    const categoryMatch = line.match(/^\*\*([^*]+)\*\*$/);
    if (categoryMatch) {
      flushList();
      flushProgressNote();
      const categoryName = categoryMatch[1].trim();
      blocks.push(renderCategoryHeader(categoryName, i));
      continue;
    }

    // Bullet Items
    if (line.startsWith("*") || line.startsWith("-")) {
      currentList.push(line);
      continue;
    }

    // Regular paragraphs
    flushList();
    flushProgressNote();
    blocks.push(
      <p key={`p-${i}`} className="text-neutral-700 text-sm sm:text-base leading-relaxed my-2">
        {renderFormattedInline(line)}
      </p>
    );
  }

  flushList();
  flushProgressNote();

  return <div className="space-y-1">{blocks}</div>;
};

// Render Category Subheader (e.g. "AI & Engineering") without borders
function renderCategoryHeader(name: string, key: number) {
  const lower = name.toLowerCase();
  let icon = <Code className="w-3.5 h-3.5" />;
  let colorClass = "bg-blue-50 text-blue-700";

  if (lower.includes("design") || lower.includes("ui") || lower.includes("ux")) {
    icon = <Palette className="w-3.5 h-3.5" />;
    colorClass = "bg-purple-50 text-purple-700";
  } else if (lower.includes("process") || lower.includes("maintenance") || lower.includes("ops")) {
    icon = <Wrench className="w-3.5 h-3.5" />;
    colorClass = "bg-amber-50 text-amber-800";
  } else if (lower.includes("security")) {
    icon = <Shield className="w-3.5 h-3.5" />;
    colorClass = "bg-rose-50 text-rose-700";
  }

  return (
    <div key={`cat-${key}`} className="pt-3.5 pb-1 flex items-center gap-2">
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wide uppercase",
          colorClass
        )}
      >
        {icon}
        <span>{name}</span>
      </span>
    </div>
  );
}

// Render Bullet List items with clean background styling (no borders)
function renderBulletList(items: string[], key: number) {
  return (
    <div key={`list-${key}`} className="flex flex-col gap-2 my-2">
      {items.map((raw, idx) => {
        const itemText = raw.replace(/^[\*\-]\s+/, "");
        return renderTaskCard(itemText, idx);
      })}
    </div>
  );
}

// Parse a single task bullet line into structured elements:
// e.g. "**RAG Team Memory hybrid query synthesis:** Assigned to Alex Chen (Priority: High, Due: 2026-10-18)."
function renderTaskCard(text: string, idx: number) {
  let title = "";
  let rest = text;

  const boldMatch = text.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
  if (boldMatch) {
    title = boldMatch[1].replace(/:$/, "").trim();
    rest = boldMatch[2].trim();
  }

  let assignee = "";
  const assigneeMatch = rest.match(/Assigned to ([A-Za-z\s]+?)(?=\s*\(|\s*\.|$)/i);
  if (assigneeMatch) {
    assignee = assigneeMatch[1].trim();
    rest = rest.replace(assigneeMatch[0], "").trim();
  }

  let priority = "";
  const priorityMatch = text.match(/Priority:\s*(Urgent|High|Medium|Low)/i);
  if (priorityMatch) {
    priority = priorityMatch[1];
  }

  let dueDate = "";
  const dueMatch = text.match(/Due:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (dueMatch) {
    dueDate = dueMatch[1];
  }

  let notes = rest
    .replace(/\(Priority:[^)]*\)/gi, "")
    .replace(/\(Due:[^)]*\)/gi, "")
    .replace(/\([^)]*Priority[^)]*\)/gi, "")
    .replace(/^\./, "")
    .replace(/^,/, "")
    .trim();

  if (!title) {
    return (
      <div
        key={idx}
        className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 text-sm text-neutral-800"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
        <div className="flex-1 leading-relaxed">{renderFormattedInline(text)}</div>
      </div>
    );
  }

  return (
    <div
      key={idx}
      className="group p-3 sm:p-3.5 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
    >
      {/* Left: Pointer dot + Task Title + Extra Notes */}
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0 group-hover:scale-125 transition-transform" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-neutral-900 text-sm sm:text-base leading-snug">
            {title}
          </span>
          {notes && (
            <span className="text-xs text-neutral-500 leading-relaxed">
              {notes}
            </span>
          )}
        </div>
      </div>

      {/* Right: Metadata Pills without borders */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-center ml-4 sm:ml-0 shrink-0">
        {/* Assignee Badge */}
        {assignee && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100/70 text-neutral-700 text-xs font-medium">
            <User className="w-3 h-3 text-neutral-500" />
            <span>{assignee}</span>
          </span>
        )}

        {/* Priority Badge */}
        {priority && renderPriorityBadge(priority)}

        {/* Due Date Badge */}
        {dueDate && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100/70 text-neutral-600 text-xs font-medium">
            <Calendar className="w-3 h-3 text-neutral-500" />
            <span>{dueDate}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function renderPriorityBadge(priority: string) {
  const p = priority.toLowerCase();
  if (p === "urgent") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider">
        <Flame className="w-3 h-3 text-red-600" />
        <span>Urgent</span>
      </span>
    );
  }
  if (p === "high") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>High</span>
      </span>
    );
  }
  if (p === "medium") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
        <span>Medium</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100/70 text-neutral-600 text-xs font-medium">
      <span>{priority}</span>
    </span>
  );
}

// Render Sources / Citations line without borders
function renderSourceItem(line: string, key: number) {
  const clean = line.replace(/^[\*\-]\s+/, "").replace(/^\*|\*$/g, "").trim();
  const parts = clean.split(/(\[[^\]]+\])/g);

  return (
    <div
      key={`source-${key}`}
      className="p-3.5 my-1.5 rounded-xl bg-neutral-50 text-xs text-neutral-600 flex items-start gap-2.5"
    >
      <Database className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith("[") && part.endsWith("]")) {
            const inner = part.slice(1, -1);
            let icon = <FileText className="w-3 h-3" />;
            if (inner.includes("DECISION")) icon = <Shield className="w-3 h-3 text-purple-600" />;
            if (inner.includes("VOICE_NOTE")) icon = <Mic className="w-3 h-3 text-blue-600" />;
            if (inner.includes("TASK")) icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;

            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 mx-1 my-0.5 px-2.5 py-1 rounded-lg bg-white/90 text-neutral-800 font-medium"
              >
                {icon}
                <span>{inner}</span>
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    </div>
  );
}

// Inline formatting helper for bold and code
function renderFormattedInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-neutral-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

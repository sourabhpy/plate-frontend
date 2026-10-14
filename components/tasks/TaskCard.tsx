"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, Paperclip, MessageSquareQuote, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

export interface TaskItem {
  id: string;
  workspace: string;
  title: string;
  description: string;
  status: "inbox" | "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string | null;
  labels: string[];
  source_type: string;
  source_id: string;
  evidence_quote?: string;
  position: number;
  assignee?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    title: string;
  } | null;
  attachments?: any[];
  activities?: any[];
  created_at: string;
  updated_at: string;
}

interface TaskCardProps {
  task: TaskItem;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDragStart }) => {
  const isDone = task.status === "done";

  const formatDeadline = (dl: string) => {
    try {
      const date = new Date(dl);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dl;
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={onClick}
      className={clsx(
        "group bg-white rounded-lg border border-neutral-200 p-3.5 hover:border-neutral-300 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2.5 select-none",
        isDone && "bg-neutral-50/60 opacity-80"
      )}
    >
      {/* Labels & Priority */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant={task.status} size="sm">
            {task.status.replace("_", " ")}
          </Badge>
          <Badge variant={task.priority} size="sm">
            {task.priority}
          </Badge>
        </div>

        {task.assignee && (
          <Avatar name={task.assignee.user.name} size="xs" />
        )}
      </div>

      {/* Title */}
      <h4
        className={clsx(
          "text-xs font-semibold text-neutral-900 leading-snug line-clamp-2",
          isDone && "line-through text-neutral-500"
        )}
      >
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer Meta */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[11px] text-neutral-400">
        <div className="flex items-center gap-2.5">
          {task.deadline && (
            <span className="flex items-center gap-1 text-neutral-600 font-medium">
              <Clock className="w-3 h-3 text-neutral-400" />
              <span>{formatDeadline(task.deadline)}</span>
            </span>
          )}

          {task.evidence_quote && (
            <span title={`Extracted quote: "${task.evidence_quote}"`} className="text-blue-600">
              <MessageSquareQuote className="w-3.5 h-3.5" />
            </span>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-neutral-500">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </span>
          )}
        </div>

        {task.labels && task.labels.length > 0 && (
          <span className="text-[10px] text-neutral-400 font-mono">
            #{task.labels[0]}
          </span>
        )}
      </div>
    </div>
  );
};

"use client";

import React, { useState, useEffect } from "react";
import { useAuth, WorkspaceMember } from "@/lib/auth-context";
import { TaskCard, TaskItem } from "./TaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import clsx from "clsx";

export const TaskBoard: React.FC = () => {
  const { activeWorkspace, members } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Quick Task Creation
  const [isCreating, setIsCreating] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAssigneeId, setQuickAssigneeId] = useState<string>("");

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (members.length > 0 && !quickAssigneeId) {
      setQuickAssigneeId(members[0].id);
    }
  }, [members, quickAssigneeId]);

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    try {
      const data = await apiRequest<TaskItem[]>("/api/tasks/");
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace]);

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  // Group tasks by team member (if a task has no assignee, group under admin/first member)
  const memberTasksMap: Record<string, TaskItem[]> = {};
  members.forEach((m) => {
    memberTasksMap[m.id] = filteredTasks.filter((t) => {
      if (t.assignee) {
        return t.assignee.id === m.id;
      }
      return m.role === "admin" || m.id === members[0]?.id;
    });
  });

  // Filter columns if hideEmptyColumns is active
  const displayedMembers = hideEmptyColumns
    ? members.filter((m) => (memberTasksMap[m.id]?.length || 0) > 0)
    : members;

  // Drag & Drop Handlers with Persistent Backend Updates & Rollback
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, targetMemberId: string) => {
    e.preventDefault();
    setDragOverMemberId(targetMemberId);
  };

  const handleDrop = async (e: React.DragEvent, targetMemberId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDragOverMemberId(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const originalTasks = [...tasks];
    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    const targetMember = members.find((m) => m.id === targetMemberId);
    if (!targetMember) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignee: targetMember } : t))
    );

    try {
      const updated = await apiRequest<TaskItem>(`/api/tasks/${taskId}/move/`, {
        method: "PATCH",
        body: JSON.stringify({
          assignee_id: targetMemberId,
        }),
      });
      // Replace with server authoritative response
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error("Failed to move task, rolling back", err);
      // Rollback to original state
      setTasks(originalTasks);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const assignee = quickAssigneeId || members[0]?.id;
    try {
      const newTask = await apiRequest<TaskItem>("/api/tasks/", {
        method: "POST",
        body: JSON.stringify({
          title: quickTitle.trim(),
          assignee_id: assignee,
          status: "inbox",
          priority: "medium",
        }),
      });
      setTasks((prev) => [newTask, ...prev]);
      setQuickTitle("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-white">
      {/* Top Filter & Action Bar */}
      <div className="px-6 py-3 border-b border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-neutral-50 rounded-md border border-neutral-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs px-2.5 rounded-md border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="inbox">Inbox</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 text-xs px-2.5 rounded-md border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Hide Empty Columns Toggle */}
          <button
            type="button"
            onClick={() => setHideEmptyColumns(!hideEmptyColumns)}
            className={clsx(
              "h-8 text-xs px-2.5 rounded-md border flex items-center gap-1.5 transition-colors",
              hideEmptyColumns
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{hideEmptyColumns ? "Hiding Empty" : "Hide Empty Columns"}</span>
          </button>
        </div>

        {/* New Task Trigger */}
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Quick Task Creation Drawer/Banner */}
      {isCreating && (
        <form
          onSubmit={handleCreateTask}
          className="px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center gap-3 animate-in slide-in-from-top-2"
        >
          <input
            type="text"
            autoFocus
            placeholder="What needs to be done?"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="flex-1 h-9 px-3 text-xs bg-white rounded-md border border-neutral-200 focus:outline-none focus:border-blue-500"
          />
          <select
            value={quickAssigneeId}
            onChange={(e) => setQuickAssigneeId(e.target.value)}
            className="h-9 px-3 text-xs bg-white rounded-md border border-neutral-200 focus:outline-none"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Assign to {m.user.name}
              </option>
            ))}
          </select>
          <Button size="sm" type="submit">
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => {
              setIsCreating(false);
              setQuickTitle("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}

      {/* Horizontally Scrollable Row of Team Members */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-5 items-start">
        {displayedMembers.map((member) => {
          const memberTasks = memberTasksMap[member.id] || [];
          const isDragOver = dragOverMemberId === member.id;

          return (
            <div
              key={member.id}
              onDragOver={(e) => handleDragOver(e, member.id)}
              onDrop={(e) => handleDrop(e, member.id)}
              className={clsx(
                "w-80 shrink-0 flex flex-col max-h-full rounded-xl border bg-neutral-50/70 p-3 transition-colors",
                isDragOver
                  ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20"
                  : "border-neutral-200"
              )}
            >
              {/* Member Column Header */}
              <div className="flex items-center justify-between pb-3 px-1 border-b border-neutral-200/80 mb-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={member.user.name} size="sm" />
                  <div className="truncate max-w-[170px]">
                    <h3 className="text-xs font-bold text-neutral-900 truncate tracking-tight">
                      {member.user.name}
                    </h3>
                    <span className="text-[11px] text-neutral-400 truncate block">
                      {member.title || member.role}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700">
                  {memberTasks.length}
                </span>
              </div>

              {/* Vertical Task Stack */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5 min-h-[120px]">
                {memberTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDetailOpen(true);
                    }}
                    onDragStart={handleDragStart}
                  />
                ))}
                {memberTasks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-400 text-xs">
                    <span>Drop tasks here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTask(updated);
        }}
        onDelete={(deletedId) => {
          setTasks((prev) => prev.filter((t) => t.id !== deletedId));
          setSelectedTask(null);
        }}
      />
    </div>
  );
};

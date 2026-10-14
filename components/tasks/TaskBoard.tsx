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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Quick Task Creation
  const [isCreating, setIsCreating] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAssigneeId, setQuickAssigneeId] = useState<string>("unassigned");

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);

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

  // Group tasks by Member (and Unassigned)
  const unassignedTasks = filteredTasks.filter((t) => !t.assignee);
  const memberTasksMap: Record<string, TaskItem[]> = {};
  members.forEach((m) => {
    memberTasksMap[m.id] = filteredTasks.filter((t) => t.assignee?.id === m.id);
  });

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

    const targetMember = targetMemberId === "unassigned" ? null : members.find((m) => m.id === targetMemberId);

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignee: targetMember } : t))
    );

    try {
      const updated = await apiRequest<TaskItem>(`/api/tasks/${taskId}/move/`, {
        method: "PATCH",
        body: JSON.stringify({
          assignee_id: targetMemberId === "unassigned" ? null : targetMemberId,
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

    try {
      const newTask = await apiRequest<TaskItem>("/api/tasks/", {
        method: "POST",
        body: JSON.stringify({
          title: quickTitle.trim(),
          assignee_id: quickAssigneeId === "unassigned" ? null : quickAssigneeId,
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
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-full rounded-md border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-400"
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
            <option value="unassigned">Unassigned</option>
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

      {/* Horizontally Scrollable Row of Team Members + Unassigned Column */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-5 items-start">
        {/* 1. Unassigned Column */}
        <div
          onDragOver={(e) => handleDragOver(e, "unassigned")}
          onDrop={(e) => handleDrop(e, "unassigned")}
          className={clsx(
            "w-80 shrink-0 flex flex-col max-h-full rounded-xl border bg-neutral-50/70 p-3 transition-colors",
            dragOverMemberId === "unassigned"
              ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20"
              : "border-neutral-200"
          )}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 px-1 border-b border-neutral-200/80 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-semibold text-xs">
                ?
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 tracking-tight">
                  Unassigned
                </h3>
                <span className="text-[11px] text-neutral-400">Needs owner</span>
              </div>
            </div>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700">
              {unassignedTasks.length}
            </span>
          </div>

          {/* Vertical Task Stack */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5 min-h-[120px]">
            {unassignedTasks.map((task) => (
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
            {unassignedTasks.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-400 text-xs">
                <span>No unassigned tasks</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Team Member Columns */}
        {members.map((member) => {
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

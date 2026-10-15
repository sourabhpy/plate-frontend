"use client";

import React, { useState, useEffect } from "react";
import { useAuth, WorkspaceMember } from "@/lib/auth-context";
import { TaskCard, TaskItem } from "./TaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FullscreenMobileSearch } from "@/components/ui/FullscreenMobileSearch";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  X,
  Mic,
  FileText,
} from "lucide-react";
import clsx from "clsx";

interface TaskBoardProps {
  onOpenVoiceModal?: () => void;
  onOpenDocModal?: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  onOpenVoiceModal,
  onOpenDocModal,
}) => {
  const { activeWorkspace, members } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchQuote = t.evidence_quote?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchQuote) return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  // Group tasks by workspace member assignee
  const memberTasksMap: Record<string, TaskItem[]> = {};
  members.forEach((m) => {
    memberTasksMap[m.id] = [];
  });

  filteredTasks.forEach((t) => {
    const assigneeId = t.assignee?.id;
    if (assigneeId && memberTasksMap[assigneeId]) {
      memberTasksMap[assigneeId].push(t);
    } else {
      if (members.length > 0) {
        memberTasksMap[members[0].id]?.push(t);
      }
    }
  });

  const displayedMembers = hideEmptyColumns
    ? members.filter((m) => (memberTasksMap[m.id]?.length || 0) > 0)
    : members;

  // Drag & Drop Handlers
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
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error("Failed to move task, rolling back", err);
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

  const statusChips = [
    { id: "all", label: "All Statuses", active: statusFilter === "all", onClick: () => setStatusFilter("all") },
    { id: "inbox", label: "Inbox", active: statusFilter === "inbox", onClick: () => setStatusFilter("inbox") },
    { id: "todo", label: "To Do", active: statusFilter === "todo", onClick: () => setStatusFilter("todo") },
    { id: "in_progress", label: "In Progress", active: statusFilter === "in_progress", onClick: () => setStatusFilter("in_progress") },
    { id: "in_review", label: "In Review", active: statusFilter === "in_review", onClick: () => setStatusFilter("in_review") },
    { id: "done", label: "Done", active: statusFilter === "done", onClick: () => setStatusFilter("done") },
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-white">
      {/* Top Filter & Action Bar */}
      <div className="px-4 md:px-6 py-5 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-3xl overflow-x-auto no-scrollbar">
          {/* Desktop Search Input */}
          <div className="relative hidden md:block flex-1 max-w-xs">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Mobile Search Trigger Button (opens Fullscreen Search Input) */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className="md:hidden flex items-center gap-2 px-3 py-2 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-600 transition-colors flex-1"
          >
            <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <span className="line-clamp-1 text-left flex-1">
              {searchQuery ? searchQuery : "Search tasks..."}
            </span>
            {searchQuery && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                }}
                className="p-0.5 rounded-full hover:bg-neutral-300"
              >
                <X className="w-3.5 h-3.5 flex-shrink-0 text-neutral-500" />
              </span>
            )}
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-sm px-3 rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-blue-500 flex-shrink-0"
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
            className="h-9 text-sm px-3 rounded-lg border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:border-blue-500 hidden sm:block flex-shrink-0"
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
              "h-9 text-sm px-3 rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0 border",
              hideEmptyColumns
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{hideEmptyColumns ? "Hiding Empty" : "Hide Empty"}</span>
          </button>
        </div>

        {/* Actions at Top Right: Voice Task, Analyze Doc, and New Task (Desktop lg+ only, hidden on mobile/md) */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          {onOpenVoiceModal && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenVoiceModal}
              className="shadow-xs"
            >
              <Mic className="w-4 h-4 text-neutral-700 flex-shrink-0" />
              <span className="line-clamp-1">Voice Task</span>
            </Button>
          )}

          {onOpenDocModal && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenDocModal}
              className="shadow-xs"
            >
              <FileText className="w-4 h-4 text-neutral-600 flex-shrink-0" />
              <span className="line-clamp-1">Analyze Doc</span>
            </Button>
          )}

          <Button size="sm" onClick={() => setIsCreating(true)} className="flex-shrink-0">
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">New Task</span>
          </Button>
        </div>
      </div>

      {/* Quick Task Creation Drawer/Banner (Desktop lg+) */}
      {isCreating && (
        <form
          onSubmit={handleCreateTask}
          className="hidden lg:flex px-4 md:px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex-wrap items-center gap-3 animate-in slide-in-from-top-2"
        >
          <input
            type="text"
            autoFocus
            placeholder="What needs to be done?"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="flex-1 min-w-[200px] h-10 px-3.5 text-base sm:text-sm bg-white rounded-lg border border-neutral-200 focus:outline-none focus:border-blue-500"
          />
          <select
            value={quickAssigneeId}
            onChange={(e) => setQuickAssigneeId(e.target.value)}
            className="h-10 px-3 text-sm bg-white rounded-lg border border-neutral-200 focus:outline-none"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Assign to {m.user.name}
              </option>
            ))}
          </select>
          <Button size="sm" type="submit">
            <span className="line-clamp-1">Create</span>
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
            <span className="line-clamp-1">Cancel</span>
          </Button>
        </form>
      )}

      {/* Horizontally Scrollable Row of Team Member Columns */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 flex gap-4 sm:gap-6 items-start snap-x snap-mandatory">
        {displayedMembers.map((member) => {
          const memberTasks = memberTasksMap[member.id] || [];
          const isDragOver = dragOverMemberId === member.id;

          return (
            <div
              key={member.id}
              onDragOver={(e) => handleDragOver(e, member.id)}
              onDrop={(e) => handleDrop(e, member.id)}
              className={clsx(
                "w-[85vw] sm:w-80 shrink-0 flex flex-col max-h-full rounded-2xl bg-white shadow-[0px_0px_30px_rgba(0,0,0,0.08)] p-4 transition-colors snap-center",
                isDragOver ? "bg-blue-50/30 ring-2 ring-blue-500/30" : ""
              )}
            >
              {/* Member Column Header */}
              <div className="flex items-center justify-between pb-3 px-1 mb-3">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={member.user.name}
                    src={member.user.avatar || (member.user as any).avatar_url}
                    size="sm"
                  />
                  <div className="truncate max-w-[170px]">
                    <h3 className="text-sm font-bold text-neutral-900 truncate tracking-tight">
                      {member.user.name}
                    </h3>
                    <span className="text-xs text-neutral-500 truncate block">
                      {member.title || member.role}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-inter font-semibold px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700 flex-shrink-0">
                  {memberTasks.length}
                </span>
              </div>

              {/* Vertical Task Stack */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-0.5 min-h-[140px]">
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
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-white/70 shadow-[0px_0px_20px_rgba(0,0,0,0.04)] text-neutral-400 text-sm">
                    <span className="line-clamp-1">Drop tasks here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Search Input for Mobile Devices */}
      <FullscreenMobileSearch
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filter tasks by title or details..."
        chips={statusChips}
        resultCount={filteredTasks.length}
      >
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setSelectedTask(task);
                setIsDetailOpen(true);
                setIsMobileSearchOpen(false);
              }}
              className="cursor-pointer"
            >
              <TaskCard task={task} onClick={() => {}} />
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-sm text-neutral-400">
            No tasks match your search query.
          </div>
        )}
      </FullscreenMobileSearch>

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

      {/* Mobile/Tablet Hovering Circular + Button (Active up to lg) */}
      <button
        type="button"
        onClick={() => setIsCreating(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-neutral-950 text-white shadow-[0px_4px_24px_rgba(0,0,0,0.35)] hover:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        aria-label="Create new task"
      >
        <Plus className="w-7 h-7 text-white flex-shrink-0" />
      </button>

      {/* Quick Task Creation Bottom Sheet (Active up to lg) */}
      {isCreating && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => {
              setIsCreating(false);
              setQuickTitle("");
            }}
          />
          <form
            onSubmit={handleCreateTask}
            className="relative w-full bg-white rounded-t-2xl p-5 shadow-[0px_-8px_30px_rgba(0,0,0,0.15)] flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-base font-bold text-neutral-900">New Task</span>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setQuickTitle("");
                }}
                className="text-neutral-400 hover:text-neutral-700 p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5 flex-shrink-0" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="What needs to be done?"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full h-11 px-3.5 text-base bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-500">Assign To</label>
              <select
                value={quickAssigneeId}
                onChange={(e) => setQuickAssigneeId(e.target.value)}
                className="w-full h-11 px-3 text-base bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="md" className="flex-1">
                <span className="line-clamp-1">Create Task</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setIsCreating(false);
                  setQuickTitle("");
                }}
              >
                <span className="line-clamp-1">Cancel</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

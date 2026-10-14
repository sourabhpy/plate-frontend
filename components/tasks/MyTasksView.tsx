"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { TaskCard, TaskItem } from "./TaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Clock, Calendar, AlertCircle } from "lucide-react";

export const MyTasksView: React.FC = () => {
  const { user, activeWorkspace } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    apiRequest<TaskItem[]>("/api/tasks/?assignee=me")
      .then(setTasks)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeWorkspace]);

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const completedTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1 pb-6 border-b border-neutral-200">
        <h1 className="text-xl font-bold tracking-tight text-neutral-950">My Tasks</h1>
        <p className="text-xs text-neutral-500">
          Dedicated view of your assignments, deadlines, updates, and attachments across {activeWorkspace?.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div className="p-4 rounded-lg border border-neutral-200 bg-white">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Active Assignments
          </span>
          <span className="text-2xl font-bold text-neutral-900">{activeTasks.length}</span>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 bg-white">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Completed
          </span>
          <span className="text-2xl font-bold text-emerald-600">{completedTasks.length}</span>
        </div>
        <div className="p-4 rounded-lg border border-neutral-200 bg-white">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Due Soon
          </span>
          <span className="text-2xl font-bold text-amber-600">
            {activeTasks.filter((t) => t.deadline).length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <span>In Flight ({activeTasks.length})</span>
          </h2>
          {activeTasks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDetailOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 border border-neutral-200 rounded-lg text-center text-xs text-neutral-400 bg-neutral-50/50">
              You currently have no active assignments.
            </div>
          )}
        </div>

        {completedTasks.length > 0 && (
          <div className="pt-4 border-t border-neutral-200">
            <h2 className="text-sm font-bold text-neutral-500 mb-3">
              Completed Tasks ({completedTasks.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDetailOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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

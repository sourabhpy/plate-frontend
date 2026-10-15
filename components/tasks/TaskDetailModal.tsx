"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { TaskItem } from "./TaskCard";
import { useAuth, WorkspaceMember } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { FileViewerModal } from "@/components/ui/FileViewerModal";
import { validateFileUpload } from "@/lib/file-validation";
import {
  Calendar,
  Clock,
  User,
  Paperclip,
  Trash2,
  CheckCircle2,
  ArrowRight,
  MessageSquareQuote,
  Upload,
  Eye,
  Download,
} from "lucide-react";

interface TaskDetailModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: TaskItem) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const { members, activeWorkspace } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "inbox");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 10) : "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee?.id || "unassigned");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<{
    url: string;
    name: string;
    type?: string;
  } | null>(null);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDeadline(task.deadline ? task.deadline.slice(0, 10) : "");
      setAssigneeId(task.assignee?.id || "unassigned");
    }
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiRequest<TaskItem>(`/api/tasks/${task.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          deadline: deadline || null,
          assignee_id: assigneeId === "unassigned" ? null : assigneeId,
        }),
      });
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileUpload(file, { label: "Attachment" });
    if (!validation.isValid) {
      alert(validation.error);
      if (e.target) e.target.value = "";
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiRequest(`/api/tasks/${task.id}/attachments/`, {
        method: "POST",
        body: formData,
      });
      // Refresh task
      const refreshed = await apiRequest<TaskItem>(`/api/tasks/${task.id}/`);
      onUpdate(refreshed);
    } catch (err: any) {
      console.error("Failed to upload attachment", err);
      alert(err.message || "Failed to upload attachment.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiRequest(`/api/tasks/${task.id}/`, { method: "DELETE" });
      onDelete(task.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="flex flex-col gap-6">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                apiRequest<TaskItem>(`/api/tasks/${task.id}/`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: e.target.value }),
                }).then(onUpdate);
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="inbox">Inbox</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>

            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as any);
                apiRequest<TaskItem>(`/api/tasks/${task.id}/`, {
                  method: "PATCH",
                  body: JSON.stringify({ priority: e.target.value }),
                }).then(onUpdate);
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={handleDelete} title="Delete Task">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Task Title & Description */}
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            placeholder="Task Title"
            className="text-lg font-bold text-neutral-950 border-none p-0 focus:outline-none focus:ring-0 placeholder:text-neutral-400"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            rows={3}
            placeholder="Add details, specifications, or notes..."
            className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-md p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-400 resize-y"
          />
        </div>

        {/* Evidence Quote (if extracted by AI) */}
        {task.evidence_quote && (
          <div className="p-4 bg-blue-50/70 rounded-xl shadow-[0px_0px_20px_rgba(37,99,235,0.08)] flex items-start gap-3 text-sm text-blue-950">
            <MessageSquareQuote className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-blue-900 block mb-0.5">
                AI Source Evidence ({task.source_type}):
              </span>
              <p className="italic text-blue-850">"{task.evidence_quote}"</p>
            </div>
          </div>
        )}

        {/* Metadata Grid: Assignee, Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50/80 rounded-xl shadow-[0px_0px_20px_rgba(0,0,0,0.04)]">
          {/* Assignee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => {
                const val = e.target.value;
                setAssigneeId(val);
                apiRequest<TaskItem>(`/api/tasks/${task.id}/`, {
                  method: "PATCH",
                  body: JSON.stringify({ assignee_id: val === "unassigned" ? null : val }),
                }).then(onUpdate);
              }}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name} ({m.title || m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => {
                const val = e.target.value;
                setDeadline(val);
                apiRequest<TaskItem>(`/api/tasks/${task.id}/`, {
                  method: "PATCH",
                  body: JSON.stringify({ deadline: val || null }),
                }).then(onUpdate);
              }}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <span className="line-clamp-1">Attachments ({task.attachments?.length || 0})</span>
            </h4>

            <label className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{isUploading ? "Uploading..." : "Upload File (up to 5MB)"}</span>
              <input type="file" multiple={false} onChange={handleFileUpload} className="hidden" disabled={isUploading} />
            </label>
          </div>

          {task.attachments && task.attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
              {task.attachments.map((att: any) => {
                const fileUrl = att.file_url || att.file;
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white shadow-[0px_0px_20px_rgba(0,0,0,0.06)] hover:bg-neutral-50/80 hover:border-neutral-300 border border-neutral-100 transition-all text-sm text-neutral-800 group"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setViewingAttachment({
                          url: fileUrl,
                          name: att.file_name || "Attachment",
                          type: att.file_type || "",
                        })
                      }
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      title={`Preview ${att.file_name} in file viewer`}
                    >
                      <Paperclip className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 flex-shrink-0 transition-colors" />
                      <span className="truncate font-medium text-neutral-800 group-hover:text-blue-600 transition-colors">
                        {att.file_name}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-xs text-neutral-400 font-inter">
                        {Math.round((att.file_size || 0) / 1024)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setViewingAttachment({
                            url: fileUrl,
                            name: att.file_name || "Attachment",
                            type: att.file_type || "",
                          })
                        }
                        className="p-1 rounded-md text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="View in file viewer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 italic">No files attached yet.</p>
          )}
        </div>

        {/* Audit Activity History Timeline */}
        <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100">
          <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>Activity History</span>
          </h4>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {task.activities && task.activities.length > 0 ? (
              task.activities.map((act: any) => (
                <div key={act.id} className="text-xs text-neutral-600 flex items-start gap-2 py-1 border-b border-neutral-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-neutral-800">{act.description}</p>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 italic">No activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {viewingAttachment && (
        <FileViewerModal
          isOpen={!!viewingAttachment}
          onClose={() => setViewingAttachment(null)}
          fileUrl={viewingAttachment.url}
          fileName={viewingAttachment.name}
          fileType={viewingAttachment.type}
        />
      )}
    </Modal>
  );
};

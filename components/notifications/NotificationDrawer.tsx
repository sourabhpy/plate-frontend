"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCheck,
} from "lucide-react";
import clsx from "clsx";

interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  task_id?: string;
  task_title?: string;
  created_at: string;
  actor?: {
    name: string;
    email: string;
  };
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (taskId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTask,
  onUnreadCountChange,
}) => {
  const { activeWorkspace } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!activeWorkspace) return;
    try {
      const data = await apiRequest<{ results: NotificationItem[]; unread_count: number }>(
        "/api/notifications/"
      );
      setNotifications(data.results || []);
      if (onUnreadCountChange) onUnreadCountChange(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeWorkspace]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/api/notifications/mark-all-read/", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read/`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-[0px_0px_30px_rgba(0,0,0,0.2)] z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-neutral-800 flex-shrink-0" />
            <h3 className="text-base font-bold text-neutral-950">Notifications</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-neutral-100 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">Read all</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 flex-shrink-0"
            >
              <X className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.is_read) handleMarkRead(n.id);
                if (n.task_id && onSelectTask) {
                  onSelectTask(n.task_id);
                  onClose();
                }
              }}
              className={clsx(
                "p-4 rounded-xl transition-all text-sm flex flex-col gap-1.5 cursor-pointer",
                n.is_read
                  ? "bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.08)] hover:bg-neutral-50"
                  : "bg-blue-50/70 shadow-[0px_0px_25px_rgba(37,99,235,0.12)] hover:bg-blue-50/90"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-neutral-900 leading-snug">{n.title}</span>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                )}
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed">{n.message}</p>
              <span className="text-xs text-neutral-400 font-mono mt-1">
                {new Date(n.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400 text-sm">
              <Bell className="w-8 h-8 text-neutral-300 mb-2 flex-shrink-0" />
              <span className="line-clamp-1">You're all caught up!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

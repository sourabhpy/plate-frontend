"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Kanban,
  MessageSquare,
  Sparkles,
  FileText,
  UserCheck,
  Mic,
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Shield,
} from "lucide-react";
import clsx from "clsx";

interface HeaderProps {
  activeTab: "board" | "communications" | "my-tasks" | "memory" | "documents";
  setActiveTab: (tab: "board" | "communications" | "my-tasks" | "memory" | "documents") => void;
  onOpenVoiceModal: () => void;
  onOpenDocModal: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenVoiceModal,
  onOpenDocModal,
  onOpenNotifications,
  unreadCount = 0,
}) => {
  const { user, workspaces, activeWorkspace, switchWorkspace, logout } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 border-b border-neutral-200 bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand + Workspace Switcher */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setActiveTab("board")}>
            <span className="text-xl font-bold tracking-tight text-neutral-950">Plate</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mb-0.5"></span>
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Workspace Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md hover:bg-neutral-100 text-neutral-800 transition-colors"
            >
              <span className="truncate max-w-[130px]">{activeWorkspace?.name || "Workspace"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {showWorkspaceMenu && (
              <div
                className="absolute top-full left-0 mt-1 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95"
                onClick={() => setShowWorkspaceMenu(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => switchWorkspace(ws.id)}
                    className={clsx(
                      "w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50",
                      ws.id === activeWorkspace?.id && "font-semibold text-blue-600 bg-blue-50/50"
                    )}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.my_role === "admin" && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                        Admin
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab("board")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "board"
                ? "bg-neutral-100 text-neutral-950 font-semibold"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Task Board</span>
          </button>

          <button
            onClick={() => setActiveTab("communications")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "communications"
                ? "bg-neutral-100 text-neutral-950 font-semibold"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communications</span>
          </button>

          <button
            onClick={() => setActiveTab("my-tasks")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "my-tasks"
                ? "bg-neutral-100 text-neutral-950 font-semibold"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab("memory")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "memory"
                ? "bg-neutral-100 text-neutral-950 font-semibold"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Team Memory</span>
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "documents"
                ? "bg-neutral-100 text-neutral-950 font-semibold"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Doc Analysis</span>
          </button>
        </nav>
      </div>

      {/* Right: AI Quick Action + Notifications + User Menu */}
      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenVoiceModal}
          className="hidden sm:inline-flex"
        >
          <Mic className="w-3.5 h-3.5 text-blue-600" />
          <span>Voice Task</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenDocModal}
          className="hidden sm:inline-flex"
        >
          <FileText className="w-3.5 h-3.5 text-neutral-600" />
          <span>Analyze Doc</span>
        </Button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-neutral-500 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>

        <div className="h-4 w-px bg-neutral-200" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <Avatar name={user?.name || "User"} size="sm" />
            <span className="hidden lg:inline text-xs font-medium text-neutral-800 truncate max-w-[100px]">
              {user?.name}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95"
              onClick={() => setShowUserMenu(false)}
            >
              <div className="px-3 py-1.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PlateBrand } from "@/components/ui/PlateBrand";
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
  Menu,
  X,
  Plus,
  Shield,
  Layers,
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const navigationTabs = [
    { id: "board", label: "Task Board", icon: Kanban },
    { id: "communications", label: "Communications", icon: MessageSquare },
    { id: "my-tasks", label: "My Tasks", icon: UserCheck },
    { id: "memory", label: "Team Memory", icon: Sparkles, iconClass: "text-blue-600" },
    { id: "documents", label: "Doc Analysis", icon: FileText },
  ] as const;

  return (
    <>
      <header className="h-14 border-b border-neutral-200 bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Left: Brand + Workspace Switcher */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-3">
            <div
              className="cursor-pointer flex items-center"
              onClick={() => setActiveTab("board")}
            >
              <PlateBrand size="lg" />
            </div>

            <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

            {/* Workspace Switcher */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 transition-colors"
              >
                <span className="line-clamp-1 max-w-[140px]">{activeWorkspace?.name || "Workspace"}</span>
                <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              </button>

              {showWorkspaceMenu && (
                <div
                  className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-[0px_0px_30px_rgba(0,0,0,0.1)] py-2 z-40 animate-in fade-in zoom-in-95"
                  onClick={() => setShowWorkspaceMenu(false)}
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Workspaces
                  </div>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => switchWorkspace(ws.id)}
                      className={clsx(
                        "w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-neutral-50 transition-colors",
                        ws.id === activeWorkspace?.id && "font-semibold text-blue-600 bg-blue-50/50"
                      )}
                    >
                      <span className="line-clamp-1">{ws.name}</span>
                      {ws.my_role === "admin" && (
                        <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 flex-shrink-0 ml-2">
                          Admin
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Desktop Tabs (Visible on lg+) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-neutral-100 text-neutral-950 font-semibold"
                      : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-1">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Notifications + User Menu + Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Notification Bell (always visible) */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 text-neutral-600 hover:text-neutral-950 rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          <div className="h-4 w-px bg-neutral-200 hidden lg:block" />

          {/* User Profile (Desktop lg+) */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <Avatar name={user?.name || "User"} size="sm" />
              <span className="hidden lg:inline text-sm font-medium text-neutral-800 line-clamp-1 max-w-[120px]">
                {user?.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-[0px_0px_30px_rgba(0,0,0,0.1)] py-2 z-40 animate-in fade-in zoom-in-95"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="px-3.5 py-2 border-b border-neutral-100">
                  <p className="text-sm font-semibold text-neutral-900 line-clamp-1">{user?.name}</p>
                  <p className="text-xs text-neutral-500 line-clamp-1">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-1">Log out</span>
                </button>
              </div>
            )}
          </div>

          {/* Drawer Toggle Button (Active on mobile & tablet up to lg) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 text-neutral-700 hover:text-neutral-950 rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      </header>

      {/* Drawer for Header CTAs and Navigation (Active up to lg) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end lg:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xs bg-white h-full flex flex-col shadow-[0px_0px_30px_rgba(0,0,0,0.2)] z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white">
              <PlateBrand size="lg" />
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 flex-shrink-0 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 flex-shrink-0" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              {/* Header CTAs Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                  Header CTAs & Actions
                </span>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onOpenVoiceModal();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-full justify-start gap-3 shadow-[0px_0px_20px_rgba(0,0,0,0.1)]"
                >
                  <Mic className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="line-clamp-1 font-semibold">Voice Task Extraction</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    onOpenDocModal();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-full justify-start gap-3 shadow-[0px_0px_20px_rgba(0,0,0,0.06)]"
                >
                  <FileText className="w-4 h-4 text-neutral-700 flex-shrink-0" />
                  <span className="line-clamp-1 font-semibold">Analyze Document</span>
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenNotifications();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors text-sm font-medium text-neutral-800"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                    <span className="line-clamp-1">Notifications</span>
                  </div>
                  {unreadCount > 0 ? (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {unreadCount}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400 font-mono flex-shrink-0">Caught up</span>
                  )}
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                  Navigation
                </span>

                {navigationTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                        isActive
                          ? "bg-neutral-900 text-white font-semibold shadow-[0px_0px_20px_rgba(0,0,0,0.12)]"
                          : "text-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-neutral-500")} />
                      <span className="line-clamp-1">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Workspace Switcher in Drawer */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                  Active Workspace
                </span>
                <div className="flex flex-col gap-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors",
                        ws.id === activeWorkspace?.id
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "hover:bg-neutral-50 text-neutral-700"
                      )}
                    >
                      <span className="line-clamp-1">{ws.name}</span>
                      {ws.my_role === "admin" && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 flex-shrink-0 ml-1">
                          Admin
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* User Profile & Logout at Drawer Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate max-w-[180px]">
                <Avatar name={user?.name || "User"} size="sm" />
                <div className="truncate">
                  <p className="text-sm font-semibold text-neutral-900 line-clamp-1">{user?.name}</p>
                  <p className="text-xs text-neutral-500 line-clamp-1">{user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PlateBrand } from "@/components/ui/PlateBrand";
import { AddWorkspaceModal } from "@/components/layout/AddWorkspaceModal";
import { AddUserModal } from "@/components/layout/AddUserModal";
import { ProfileModal } from "@/components/layout/ProfileModal";
import { useBackStackOverlay } from "@/lib/back-stack";
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
  User as UserIcon,
  UserPlus,
  UserMinus,
  Users,
  Settings,
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
  const { user, workspaces, activeWorkspace, activeMember, members, isAdmin, switchWorkspace, logout, removeMember } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Remove ${memberName} from this workspace?`)) {
      try {
        await removeMember(memberId);
      } catch (err: any) {
        alert(err?.message || "Failed to remove member");
      }
    }
  };

  // Hook menus and drawer into back stack
  useBackStackOverlay(isMobileDrawerOpen, () => setIsMobileDrawerOpen(false), "mobile-drawer");
  useBackStackOverlay(showWorkspaceMenu, () => setShowWorkspaceMenu(false), "workspace-menu");
  useBackStackOverlay(showUserMenu, () => setShowUserMenu(false), "user-menu");

  // Modals
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
                onClick={() => {
                  setShowWorkspaceMenu(!showWorkspaceMenu);
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 text-neutral-800 transition-colors"
              >
                <span className="line-clamp-1 max-w-[140px]">{activeWorkspace?.name || "Workspace"}</span>
                <ChevronDown
                  className={clsx(
                    "w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform duration-150",
                    showWorkspaceMenu && "rotate-180 text-neutral-700"
                  )}
                />
              </button>

              {showWorkspaceMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowWorkspaceMenu(false)}
                  />
                  <div
                    className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-[0px_10px_38px_rgba(0,0,0,0.12),0px_3px_10px_rgba(0,0,0,0.06)] border border-neutral-100 py-2.5 z-40 animate-in fade-in zoom-in-95"
                  >
                    {/* Workspaces Section */}
                    <div className="px-3.5 pb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Workspaces ({workspaces.length})
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowWorkspaceMenu(false);
                            setIsAddWorkspaceOpen(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-36 overflow-y-auto px-1 space-y-0.5">
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            switchWorkspace(ws.id);
                            setShowWorkspaceMenu(false);
                          }}
                          className={clsx(
                            "w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between hover:bg-neutral-50 transition-colors",
                            ws.id === activeWorkspace?.id && "font-semibold text-blue-600 bg-blue-50/70"
                          )}
                        >
                          <span className="line-clamp-1">{ws.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {ws.my_role === "admin" && (
                              <span className="text-[10px] uppercase font-inter px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-semibold">
                                Admin
                              </span>
                            )}
                            {ws.id === activeWorkspace?.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="h-px my-1.5" />

                    {/* Users in Workspace Section (Requirement 2) */}
                    <div className="px-3.5 py-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Users in Workspace ({members.length})
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowWorkspaceMenu(false);
                            setIsAddUserOpen(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add User</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto px-1 space-y-1">
                      {members.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-neutral-400 italic">No users found</p>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 flex items-center justify-between gap-2.5 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar
                                name={member.user?.name || "User"}
                                src={member.user?.avatar || (member.user as any)?.avatar_url}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-neutral-900 truncate">
                                  {member.user?.name}
                                  {member.user?.id === user?.id && (
                                    <span className="ml-1 text-[10px] text-neutral-400 font-normal">(You)</span>
                                  )}
                                </p>
                                <p className="text-[11px] text-neutral-400 truncate">
                                  {member.user?.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={clsx(
                                  "text-[10px] uppercase font-inter px-1.5 py-0.5 rounded-md font-semibold shrink-0",
                                  member.role === "admin"
                                    ? "bg-neutral-900 text-white border border-neutral-900"
                                    : "bg-neutral-100 text-neutral-600"
                                )}
                              >
                                {member.role}
                              </span>

                              {isAdmin && activeWorkspace?.owner !== member.user?.id && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(member.id, member.user?.name || member.user?.email);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove from workspace"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {isAdmin && (
                      <div className="px-2 pt-2 border-t border-neutral-100 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowWorkspaceMenu(false);
                            setIsAddUserOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 rounded-lg border border-blue-200/60 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          Manage / Include Users
                        </button>
                      </div>
                    )}

                  </div>
                </>
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
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowWorkspaceMenu(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <Avatar
                name={user?.name || "User"}
                src={user?.avatar || (user as any)?.avatar_url}
                size="sm"
              />
              <span className="hidden lg:inline text-sm font-medium text-neutral-800 line-clamp-1 max-w-[120px]">
                {user?.name}
              </span>
              <ChevronDown
                className={clsx(
                  "w-3.5 h-3.5 text-neutral-400 flex-shrink-0 transition-transform",
                  showUserMenu && "rotate-180"
                )}
              />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowUserMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-[0px_10px_38px_rgba(0,0,0,0.12),0px_3px_10px_rgba(0,0,0,0.06)] border border-neutral-100 py-2 z-40 animate-in fade-in zoom-in-95"
                >
                  <div className="px-3.5 py-2">
                    <p className="text-sm font-semibold text-neutral-900 line-clamp-1">{user?.name}</p>
                    <p className="text-xs text-neutral-500 line-clamp-1">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-inter px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-semibold">
                        {activeMember?.role || activeWorkspace?.my_role || "Member"}
                      </span>
                      {isAdmin && (
                        <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-inter font-semibold">
                          Admin Privileges
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setIsProfileOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors font-medium"
                    >
                      <UserIcon className="w-4 h-4 text-neutral-500" />
                      <span>My Profile</span>
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">Log out</span>
                    </button>
                  </div>
                </div>
              </>
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

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              {/* Header CTAs Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                  Actions
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
                  <Mic className="w-4 h-4 text-white flex-shrink-0" />
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
                    <span className="text-xs text-neutral-400 font-inter flex-shrink-0">Caught up</span>
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

              {/* Workspaces & Users in Drawer */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Workspaces ({workspaces.length})
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        setIsAddWorkspaceOpen(true);
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      + Add
                    </button>
                  )}
                </div>

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
                        <span className="text-xs font-inter px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 flex-shrink-0 ml-1">
                          Admin
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Users List in Drawer */}
                <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Users ({members.length})
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          setIsAddUserOpen(true);
                        }}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        + Add User
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-50/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar
                            name={m.user.name}
                            src={m.user.avatar || (m.user as any).avatar_url}
                            size="xs"
                          />
                          <span className="text-xs text-neutral-800 font-medium truncate">
                            {m.user.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-inter uppercase text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200/50">
                            {m.role}
                          </span>
                          {isAdmin && activeWorkspace?.owner !== m.user?.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id, m.user?.name || m.user?.email)}
                              className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove from workspace"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileDrawerOpen(false);
                        setIsAddUserOpen(true);
                      }}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg border border-blue-200/60"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Manage / Include Users
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* User Profile & Logout at Drawer Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsProfileOpen(true);
                }}
                className="flex items-center gap-2.5 truncate max-w-[200px] text-left hover:opacity-80 transition-opacity"
              >
                <Avatar
                  name={user?.name || "User"}
                  src={user?.avatar || (user as any)?.avatar_url}
                  size="sm"
                />
                <div className="truncate">
                  <p className="text-sm font-semibold text-neutral-900 line-clamp-1 flex items-center gap-1.5">
                    <span>{user?.name}</span>
                    <Settings className="w-3 h-3 text-neutral-400" />
                  </p>
                  <p className="text-xs text-neutral-500 line-clamp-1">{user?.email}</p>
                </div>
              </button>

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

      {/* Modals */}
      <AddWorkspaceModal
        isOpen={isAddWorkspaceOpen}
        onClose={() => setIsAddWorkspaceOpen(false)}
      />

      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};

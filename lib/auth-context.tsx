"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api";

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string | null;
  avatar_url?: string | null;
  date_joined?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner: string;
  member_count: number;
  my_role?: "admin" | "member";
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace: string;
  user: User;
  role: "admin" | "member";
  title: string;
  status: "active" | "invited" | "suspended";
  joined_at: string;
}

export interface SystemUser extends User {
  is_in_workspace: boolean;
  member_id?: string;
  role?: "admin" | "member";
  title?: string;
}

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeMember: WorkspaceMember | null;
  members: WorkspaceMember[];
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, workspaceName?: string) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  reloadMembers: () => Promise<void>;
  addWorkspace: (name: string) => Promise<Workspace>;
  addUser: (formData: FormData) => Promise<WorkspaceMember>;
  includeUsers: (userIds: string[], role?: "admin" | "member") => Promise<WorkspaceMember[]>;
  removeMember: (memberId: string) => Promise<void>;
  fetchSystemUsers: () => Promise<SystemUser[]>;
  updateProfile: (formData: FormData) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeMember, setActiveMember] = useState<WorkspaceMember | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async (wsId: string) => {
    try {
      const data = await apiRequest<WorkspaceMember[]>("/api/auth/members/", { workspaceId: wsId });
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  };

  const loadUserData = async () => {
    const token = localStorage.getItem("plate_access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const savedWsId = localStorage.getItem("plate_active_workspace_id");
      const data = await apiRequest<{
        user: User;
        workspaces: Workspace[];
        active_member: WorkspaceMember | null;
      }>("/api/auth/me/", { workspaceId: savedWsId || undefined });

      setUser(data.user);
      setWorkspaces(data.workspaces);

      let selectedWs = data.workspaces.find((w) => w.id === savedWsId);
      if (!selectedWs && data.workspaces.length > 0) {
        selectedWs = data.workspaces[0];
      }

      if (selectedWs) {
        setActiveWorkspace(selectedWs);
        localStorage.setItem("plate_active_workspace_id", selectedWs.id);
        fetchMembers(selectedWs.id);
      }
      setActiveMember(data.active_member);
    } catch (err) {
      console.error("Failed to restore session", err);
      localStorage.removeItem("plate_access_token");
      localStorage.removeItem("plate_refresh_token");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{
      user: User;
      tokens: { access: string; refresh: string };
      workspaces: Workspace[];
      active_workspace: Workspace | null;
    }>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem("plate_access_token", res.tokens.access);
    localStorage.setItem("plate_refresh_token", res.tokens.refresh);
    setUser(res.user);
    setWorkspaces(res.workspaces);

    const activeWs = res.active_workspace || res.workspaces[0] || null;
    setActiveWorkspace(activeWs);
    if (activeWs) {
      localStorage.setItem("plate_active_workspace_id", activeWs.id);
      fetchMembers(activeWs.id);
    }
  };

  const register = async (email: string, name: string, password: string, workspaceName?: string) => {
    const res = await apiRequest<{
      user: User;
      tokens: { access: string; refresh: string };
      workspace: Workspace;
    }>("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, name, password, workspace_name: workspaceName || "My Workspace" }),
    });

    localStorage.setItem("plate_access_token", res.tokens.access);
    localStorage.setItem("plate_refresh_token", res.tokens.refresh);
    setUser(res.user);
    setWorkspaces([res.workspace]);
    setActiveWorkspace(res.workspace);
    localStorage.setItem("plate_active_workspace_id", res.workspace.id);
    fetchMembers(res.workspace.id);
  };

  const logout = () => {
    localStorage.removeItem("plate_access_token");
    localStorage.removeItem("plate_refresh_token");
    localStorage.removeItem("plate_active_workspace_id");
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setActiveMember(null);
    setMembers([]);
  };

  const switchWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      localStorage.setItem("plate_active_workspace_id", ws.id);
      fetchMembers(ws.id);
      // Reload me with new workspace header
      apiRequest<{
        user: User;
        workspaces: Workspace[];
        active_member: WorkspaceMember | null;
      }>("/api/auth/me/", { workspaceId: ws.id })
        .then((data) => {
          if (data.active_member) setActiveMember(data.active_member);
        })
        .catch(() => {});
    }
  };

  const addWorkspace = async (name: string): Promise<Workspace> => {
    const newWs = await apiRequest<Workspace>("/api/auth/workspaces/", {
      method: "POST",
      body: JSON.stringify({ name }),
      workspaceId: activeWorkspace?.id,
    });
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspace(newWs);
    localStorage.setItem("plate_active_workspace_id", newWs.id);
    await fetchMembers(newWs.id);
    await loadUserData();
    return newWs;
  };

  const addUser = async (formData: FormData): Promise<WorkspaceMember> => {
    if (!activeWorkspace) throw new Error("No active workspace");
    const member = await apiRequest<WorkspaceMember>("/api/auth/members/", {
      method: "POST",
      body: formData,
      workspaceId: activeWorkspace.id,
    });
    await fetchMembers(activeWorkspace.id);
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspace.id ? { ...w, member_count: (w.member_count || 0) + 1 } : w))
    );
    return member;
  };

  const includeUsers = async (userIds: string[], role: "admin" | "member" = "member"): Promise<WorkspaceMember[]> => {
    if (!activeWorkspace) throw new Error("No active workspace");
    const res = await apiRequest<WorkspaceMember[] | WorkspaceMember>("/api/auth/members/", {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds, role }),
      workspaceId: activeWorkspace.id,
    });
    const added = Array.isArray(res) ? res : [res];
    await fetchMembers(activeWorkspace.id);
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeWorkspace.id ? { ...w, member_count: (w.member_count || 0) + added.length } : w
      )
    );
    return added;
  };

  const removeMember = async (memberId: string): Promise<void> => {
    if (!activeWorkspace) throw new Error("No active workspace");
    await apiRequest(`/api/auth/members/${memberId}/`, {
      method: "DELETE",
      workspaceId: activeWorkspace.id,
    });
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeWorkspace.id ? { ...w, member_count: Math.max(0, (w.member_count || 1) - 1) } : w
      )
    );
  };

  const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    return await apiRequest<SystemUser[]>("/api/auth/users/", {
      workspaceId: activeWorkspace?.id,
    });
  };

  const updateProfile = async (formData: FormData): Promise<User> => {
    const res = await apiRequest<{ user: User; message: string }>("/api/auth/me/", {
      method: "PATCH",
      body: formData,
      workspaceId: activeWorkspace?.id,
    });
    setUser(res.user);
    if (activeWorkspace) {
      await fetchMembers(activeWorkspace.id);
    }
    return res.user;
  };

  const isAdmin = Boolean(
    activeWorkspace?.my_role === "admin" ||
    activeMember?.role === "admin" ||
    (user && (user as any).is_staff) ||
    (user && (user as any).is_superuser)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        activeMember,
        members,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        switchWorkspace,
        reloadMembers: () => (activeWorkspace ? fetchMembers(activeWorkspace.id) : Promise.resolve()),
        addWorkspace,
        addUser,
        includeUsers,
        removeMember,
        fetchSystemUsers,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

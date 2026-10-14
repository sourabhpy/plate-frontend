"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
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

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeMember: WorkspaceMember | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, workspaceName?: string) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
  reloadMembers: () => Promise<void>;
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
      const data = await apiRequest<{
        user: User;
        workspaces: Workspace[];
        active_member: WorkspaceMember | null;
      }>("/api/auth/me/");

      setUser(data.user);
      setWorkspaces(data.workspaces);

      const savedWsId = localStorage.getItem("plate_active_workspace_id");
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
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        activeMember,
        members,
        isLoading,
        login,
        register,
        logout,
        switchWorkspace,
        reloadMembers: () => (activeWorkspace ? fetchMembers(activeWorkspace.id) : Promise.resolve()),
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

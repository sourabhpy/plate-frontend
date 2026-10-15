"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth, SystemUser } from "@/lib/auth-context";
import {
  UserPlus,
  Users,
  Camera,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  X,
  Search,
  CheckCircle2,
  Check,
  Plus,
  UserCheck,
  UserMinus,
  AlertCircle,
  Filter,
} from "lucide-react";
import clsx from "clsx";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const { addUser, includeUsers, removeMember, fetchSystemUsers, activeWorkspace, isAdmin, members } = useAuth();

  // Tab State: 'directory' (Select from system) vs 'create' (Create brand new user)
  const [modalTab, setModalTab] = useState<"directory" | "create">("directory");

  // System Users State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "available">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<"member" | "admin">("member");
  const [isIncluding, setIsIncluding] = useState(false);

  // New User Creation State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [title, setTitle] = useState("Team Member");
  const [showPassword, setShowPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load system users when modal opens or members change
  const loadSystemUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await fetchSystemUsers();
      setSystemUsers(data);
    } catch (err: any) {
      console.error("Failed to load system users", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSystemUsers();
      setSelectedUserIds([]);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, activeWorkspace?.id, members.length]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (PNG, JPG, WebP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setError(null);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setTitle("Team Member");
    removeAvatar();
    setSelectedUserIds([]);
    setError(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Toggle user selection for inclusion
  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Include a single user immediately
  const handleQuickInclude = async (user: SystemUser) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await includeUsers([user.id], selectedRole);
      setSuccessMsg(`Added ${user.name || user.email} to workspace`);
      await loadSystemUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to add user to workspace");
    }
  };

  // Bulk include selected users
  const handleBulkInclude = async () => {
    if (selectedUserIds.length === 0) return;
    setIsIncluding(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await includeUsers(selectedUserIds, selectedRole);
      setSuccessMsg(`Successfully added ${selectedUserIds.length} user(s) to ${activeWorkspace?.name || "workspace"}!`);
      setSelectedUserIds([]);
      await loadSystemUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to add selected users");
    } finally {
      setIsIncluding(false);
    }
  };

  // Remove a member from the workspace
  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this workspace?`)) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await removeMember(memberId);
      setSuccessMsg(`Removed ${userName} from workspace`);
      await loadSystemUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to remove member");
    }
  };

  // Handle creating a brand new user
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("role", role);
      formData.append("title", title.trim() || "Team Member");
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      await addUser(formData);
      setSuccessMsg(`User ${name.trim()} created and added to ${activeWorkspace?.name || "workspace"}!`);
      await loadSystemUsers();

      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to create and add user");
    } finally {
      setIsCreating(false);
    }
  };

  // Filtered system users
  const filteredUsers = useMemo(() => {
    return systemUsers.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === "available") {
        return !u.is_in_workspace;
      }
      return true;
    });
  }, [systemUsers, searchQuery, filterMode]);

  const availableCount = useMemo(() => {
    return systemUsers.filter((u) => !u.is_in_workspace).length;
  }, [systemUsers]);

  const inWorkspaceCount = useMemo(() => {
    return systemUsers.filter((u) => u.is_in_workspace).length;
  }, [systemUsers]);

  if (!isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Access Restricted" maxWidth="md">
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Admin Privileges Required</h3>
          <p className="text-sm text-neutral-500 max-w-xs">
            Only administrators of {activeWorkspace?.name || "this workspace"} can manage workspace members.
          </p>
          <Button variant="secondary" onClick={handleClose} className="mt-2">
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Manage Workspace Users"
      description={`Add or remove users in ${activeWorkspace?.name || "this workspace"}. System users can collaborate across multiple workspaces.`}
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-4 mt-1">
        {/* Alerts / Feedback */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-xl">
          <button
            type="button"
            onClick={() => setModalTab("directory")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all",
              modalTab === "directory"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Select from System Users ({systemUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab("create")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all",
              modalTab === "create"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* Tab 1: System Users Directory */}
        {modalTab === "directory" && (
          <div className="flex flex-col gap-3">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-neutral-200 bg-white text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={clsx(
                    "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors",
                    filterMode === "all"
                      ? "bg-neutral-900 text-white font-semibold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  All ({systemUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("available")}
                  className={clsx(
                    "px-2.5 py-1 text-xs rounded-lg font-medium transition-colors",
                    filterMode === "available"
                      ? "bg-neutral-900 text-white font-semibold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  Not in Workspace ({availableCount})
                </button>
              </div>
            </div>

            {/* Quick helper row */}
            <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
              <span>
                {selectedUserIds.length > 0
                  ? `${selectedUserIds.length} user(s) selected to include`
                  : `${inWorkspaceCount} of ${systemUsers.length} users are members of this workspace`}
              </span>

              {availableCount > 0 && filterMode !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    const availableIds = systemUsers
                      .filter((u) => !u.is_in_workspace)
                      .map((u) => u.id);
                    if (selectedUserIds.length === availableIds.length) {
                      setSelectedUserIds([]);
                    } else {
                      setSelectedUserIds(availableIds);
                    }
                  }}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  {selectedUserIds.length === availableCount ? "Deselect All" : "Select All Available"}
                </button>
              )}
            </div>

            {/* Users List */}
            <div className="max-h-72 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white">
              {isLoadingUsers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
                  <span className="text-xs">Loading system users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-400">
                  {searchQuery ? "No system users match your search." : "No users found in the system."}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      className={clsx(
                        "p-2.5 sm:px-3.5 flex items-center justify-between gap-3 transition-colors",
                        u.is_in_workspace
                          ? "bg-neutral-50/60"
                          : isSelected
                          ? "bg-blue-50/50"
                          : "hover:bg-neutral-50"
                      )}
                    >
                      {/* Left: Checkbox & User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {!u.is_in_workspace ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(u.id)}
                            className="w-4 h-4 rounded text-blue-600 border-neutral-300 focus:ring-blue-500 cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}

                        <Avatar
                          name={u.name || u.email}
                          src={u.avatar || (u as any).avatar_url}
                          size="sm"
                        />

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                            {u.name || "User"}
                          </p>
                          <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions / Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {u.is_in_workspace ? (
                          <>
                            <span className="text-[10px] sm:text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              In Workspace
                            </span>

                            {/* Remove button if not workspace owner */}
                            {u.member_id && activeWorkspace?.owner !== u.id && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(u.member_id!, u.name || u.email)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove from this workspace"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickInclude(u)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200/60 transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Include</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Bulk Action Bar */}
            {selectedUserIds.length > 0 && (
              <div className="p-3 bg-neutral-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Include <strong>{selectedUserIds.length}</strong> selected user(s) as:
                  </span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as "member" | "admin")}
                    className="bg-neutral-800 text-white text-xs rounded border border-neutral-700 px-2 py-1 focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-xs text-neutral-400 hover:text-white px-2 py-1"
                  >
                    Clear
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkInclude}
                    disabled={isIncluding}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {isIncluding ? "Including..." : `Include in Workspace`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Brand New User Form */}
        {modalTab === "create" && (
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            {/* Profile Image (Optional) */}
            <div className="flex items-center gap-4 p-3.5 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="relative">
                <Avatar
                  name={name || "New User"}
                  src={avatarPreview}
                  size="lg"
                  className="ring-2 ring-white shadow-xs"
                />
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-900 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-xs"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-800">
                  Profile Photo <span className="text-neutral-400 font-normal">(Optional)</span>
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Upload PNG, JPG, or WebP up to 5MB
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="add-user-avatar-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-neutral-500" />
                    {avatarPreview ? "Change Photo" : "Upload Photo"}
                  </button>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <Input
                label="Full Name"
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            {/* Email */}
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-800">
                Initial Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isCreating}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3.5 pr-10 py-2 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                The user can use this password to log in and update it anytime from their profile.
              </p>
            </div>

            {/* Role & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-neutral-500" />
                  Role in Workspace
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "member" | "admin")}
                  disabled={isCreating}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Input
                  label="Job Title / Role Label"
                  placeholder="e.g. Lead Designer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isCreating || !name.trim() || !email.trim() || password.length < 6}
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating User...
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create & Add User
                  </div>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

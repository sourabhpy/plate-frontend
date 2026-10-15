"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";
import {
  UserPlus,
  Camera,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  X,
  Upload,
} from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const { addUser, activeWorkspace, isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [title, setTitle] = useState("Team Member");
  const [showPassword, setShowPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setError(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

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
      setSuccessMsg(`User ${name.trim()} added successfully to ${activeWorkspace?.name || "workspace"}!`);

      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to add user to workspace");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Access Restricted" maxWidth="md">
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Admin Privileges Required</h3>
          <p className="text-sm text-neutral-500 max-w-xs">
            Only administrators of {activeWorkspace?.name || "this workspace"} can add new users.
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
      title="Add New User to Workspace"
      description={`Add a team member to ${activeWorkspace?.name || "this workspace"} with their profile credentials.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Image (Optional) */}
        <div className="flex items-center gap-4 p-3.5 bg-neutral-50 rounded-xl border border-neutral-100">
          <div className="relative">
            <Avatar
              name={name || "New User"}
              src={avatarPreview}
              size="xl"
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
            disabled={isLoading}
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
            disabled={isLoading}
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
              disabled={isLoading}
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
            The user can use this password to log in and can update it anytime from their profile.
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !name.trim() || !email.trim() || password.length < 6}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding User...
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Add User
              </div>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

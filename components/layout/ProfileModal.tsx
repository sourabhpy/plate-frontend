"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";
import {
  User as UserIcon,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, activeWorkspace, activeMember, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state whenever modal opens or user updates
  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || "");
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatarFlag(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/") || !file.type.startsWith("image/")) {
        setError("Video files are not allowed. Please select an image file (PNG, JPG, WebP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      setRemoveAvatarFlag(false);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      setError(null);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setRemoveAvatarFlag(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!newPassword) {
        setError("Please enter a new password");
        return;
      }
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters long");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirm password do not match");
        return;
      }
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      } else if (removeAvatarFlag) {
        formData.append("remove_avatar", "true");
      }

      if (newPassword) {
        formData.append("password", newPassword);
        if (currentPassword) {
          formData.append("current_password", currentPassword);
        }
      }

      await updateProfile(formData);
      setSuccessMsg("Profile updated successfully!");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatarFlag(false);

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const currentDisplayAvatar = removeAvatarFlag
    ? null
    : avatarPreview || user?.avatar || (user as any)?.avatar_url || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Profile"
      description="Manage your account profile picture and security credentials."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-1">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
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

        {/* Profile Avatar Card */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group shrink-0">
            <Avatar
              name={name || user?.name || "User"}
              src={currentDisplayAvatar}
              size="xl"
              className="ring-4 ring-white shadow-sm"
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-neutral-900">Profile Picture</h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              JPG, PNG, or WebP. Max file size: 5MB.
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="profile-avatar-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:text-neutral-950 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 text-neutral-500" />
                {currentDisplayAvatar ? "Change Picture" : "Upload Picture"}
              </button>

              {currentDisplayAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Remove picture"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Current Workspace & Role Badge */}
          <div className="sm:self-start bg-white px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 flex items-center gap-1.5 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Role:{" "}
              <strong className="text-neutral-900 capitalize">
                {activeMember?.role || activeWorkspace?.my_role || "Member"}
              </strong>
            </span>
          </div>
        </div>

        {/* Basic Info: Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Full Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Email: Read Only as per prompt requirements */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                Email Address
              </label>
            </div>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              readOnly
              className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-100/80 px-3.5 py-2 text-sm text-neutral-500 cursor-not-allowed select-none"
              title="Email cannot be changed as it is a primary identifier."
            />
            <p className="text-[11px] text-neutral-400">
              Email cannot be changed as it is a primary value.
            </p>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-neutral-600" />
              <h4 className="text-sm font-bold text-neutral-900">Change Password</h4>
            </div>
            <span className="text-xs text-neutral-400">
              Leave blank to keep current password
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-9 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-9 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {newPassword && (
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-semibold text-neutral-700">
                Current Password <span className="text-neutral-400 font-normal">(for verification)</span>
              </label>
              <div className="relative max-w-sm">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-9 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Changes...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

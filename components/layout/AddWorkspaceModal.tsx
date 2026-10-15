"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { Building2, ShieldAlert } from "lucide-react";

interface AddWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWorkspaceModal: React.FC<AddWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const { addWorkspace, isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a workspace name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await addWorkspace(name.trim());
      setName("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create workspace");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted" maxWidth="md">
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Admin Privileges Required</h3>
          <p className="text-sm text-neutral-500 max-w-xs">
            Only workspace administrators are authorized to create new workspaces.
          </p>
          <Button variant="secondary" onClick={onClose} className="mt-2">
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Workspace"
      description="Workspaces let you collaborate with distinct teams and manage isolated task boards."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Input
            label="Workspace Name"
            placeholder="e.g. Engineering, Marketing, Acme Corp"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            disabled={isLoading}
            autoFocus
            required
          />
        </div>

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
                Creating...
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Create Workspace
              </div>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

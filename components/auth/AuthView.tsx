"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(email, name, password, workspaceName || "Acme Workspace");
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await login(demoEmail, "Plate123!");
    } catch (err: any) {
      setError(err.message || "Demo login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-sm p-8 flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col gap-1 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold tracking-tight text-neutral-950">Plate</span>
            <span className="w-2 h-2 rounded-full bg-blue-600 mb-0.5"></span>
          </div>
          <p className="text-xs text-neutral-500">
            AI-Native Team Productivity & Communications Platform
          </p>
        </div>

        {/* Demo Credentials Shortcuts for Quick Testing */}
        <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Quick Demo Logins
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin("alex@acme.com")}
              className="px-2.5 py-1.5 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 text-xs text-neutral-800 font-medium text-left truncate transition-colors"
            >
              Alex (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("elena@acme.com")}
              className="px-2.5 py-1.5 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 text-xs text-neutral-800 font-medium text-left truncate transition-colors"
            >
              Elena (Designer)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {isRegister && (
            <>
              <Input
                label="Full Name"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Workspace Name"
                placeholder="Acme Robotics"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </>
          )}

          <Input
            label="Work Email"
            type="email"
            placeholder="alex@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" size="md" isLoading={isLoading} className="w-full mt-2">
            <span>{isRegister ? "Create Account & Workspace" : "Sign In to Plate"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { PlateBrand } from "@/components/ui/PlateBrand";
import {
  Sparkles,
  ArrowRight,
  Mic,
  FileText,
  Kanban,
  BrainCircuit,
} from "lucide-react";

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
        await register(email, name, password, workspaceName || "Coolcomp Workspace");
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
    <AuroraBackground className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 py-8">
        {/* Left: Hero with Big Text */}
        <motion.div
          initial={{ opacity: 0.0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="flex-1 flex flex-col gap-6 text-left max-w-2xl"
        >
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md shadow-[0px_0px_20px_rgba(0,0,0,0.06)] w-fit text-sm font-semibold text-neutral-800">
            <Sparkles className="w-4 h-4 text-black flex-shrink-0" />
            <span className="line-clamp-1 text-start">Next-Gen AI Workspace</span>
          </div>

          {/* Big Hero Headline */}
          <h1 className="tracking-tight text-neutral-950 text-2xl sm:text-4xl lg:text-4xl leading-[1.08]">Power up your Workflows</h1>
          <strong className="font-bold text-4xl sm:text-6xl lg:text-7xl">with 🍽️ plate.</strong>


          {/* Subheading */}
          <p className="text-lg sm:text-xl lg:text-2xl text-neutral-600 font-normal leading-relaxed">
            Turn ambient audio notes, complex team documents, and conversations into structured kanban tasks and collective team memory.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 backdrop-blur-md shadow-[0px_0px_20px_rgba(0,0,0,0.05)]">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 line-clamp-1 text-start">Voice Task Extraction</span>
                <span className="text-xs text-neutral-500 line-clamp-1 text-start">Convert audio to tasks</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 backdrop-blur-md shadow-[0px_0px_20px_rgba(0,0,0,0.05)]">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 line-clamp-1 text-start">Document Analyzer</span>
                <span className="text-xs text-neutral-500 line-clamp-1 text-start">Executive AI summaries</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 backdrop-blur-md shadow-[0px_0px_20px_rgba(0,0,0,0.05)]">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center flex-shrink-0">
                <Kanban className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 line-clamp-1 text-start">Collaborative Board</span>
                <span className="text-xs text-neutral-500 line-clamp-1 text-start">Drag & drop live sync</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/70 backdrop-blur-md shadow-[0px_0px_20px_rgba(0,0,0,0.05)]">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center flex-shrink-0">
                <BrainCircuit className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 line-clamp-1 text-start">Collective Memory</span>
                <span className="text-xs text-neutral-500 line-clamp-1 text-start">Instant semantic search</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Login / Signup Form */}
        <motion.div
          initial={{ opacity: 0.0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.35,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="w-full max-w-md lg:w-[440px] flex-shrink-0"
        >
          <div className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0px_0px_30px_rgba(0,0,0,0.1)] p-6 sm:p-8 flex flex-col gap-6">
            {/* Brand Header */}
            <div className="flex flex-col gap-2 text-center items-center">
              <PlateBrand size="xl" />
              <p className="text-sm text-neutral-500 font-medium">
                Sign in or register to access your workspace
              </p>
            </div>

            {/* Quick Demo Logins */}
            <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 shadow-[0px_0px_20px_rgba(0,0,0,0.04)] flex flex-col gap-2.5">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Quick Demo Logins
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("alex@coolcomp.com")}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 text-sm text-neutral-800 font-medium text-left truncate transition-colors shadow-xs"
                >
                  Alex (AI Engineer)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("elena@coolcomp.com")}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-neutral-100 text-sm text-neutral-800 font-medium text-left truncate transition-colors shadow-xs"
                >
                  Elena (Designer)
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 text-sm text-red-700 shadow-[0px_0px_20px_rgba(239,68,68,0.08)]">
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
                    placeholder="Coolcomp Robotics"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </>
              )}

              <Input
                label="Work Email"
                type="email"
                placeholder="alex@coolcomp.com"
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
                <span className="line-clamp-1 text-start">
                  {isRegister ? (
                    "Create Account & Workspace"
                  ) : (
                    <>
                      Sign In to 🍽️ <strong className="font-bold">plate</strong>
                    </>
                  )}
                </span>
                <ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />
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
                className="text-sm text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                {isRegister
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AuroraBackground >
  );
};

"use client";

import React, { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/Header";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { MyTasksView } from "@/components/tasks/MyTasksView";
import { ChatView, MessageItem } from "@/components/communications/ChatView";
import { TeamMemoryView } from "@/components/ai/TeamMemoryView";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { VoiceTaskModal } from "@/components/ai/VoiceTaskModal";
import { DocumentAnalyzerModal } from "@/components/ai/DocumentAnalyzerModal";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { AuthView } from "@/components/auth/AuthView";
import { PlateBrand } from "@/components/ui/PlateBrand";

function PlateApp() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "board" | "communications" | "my-tasks" | "memory" | "documents"
  >("board");

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  // Message extraction context
  const [extractingTranscript, setExtractingTranscript] = useState<string | undefined>(undefined);
  const [extractingMsgId, setExtractingMsgId] = useState<number | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <PlateBrand size="xl" />
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-black rounded-full animate-spin mt-2 flex-shrink-0" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const handleExtractTaskFromMessage = (message: MessageItem) => {
    setExtractingTranscript(message.content);
    setExtractingMsgId(message.id);
    setIsVoiceModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-fustat antialiased">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVoiceModal={() => {
          setExtractingTranscript(undefined);
          setExtractingMsgId(undefined);
          setIsVoiceModalOpen(true);
        }}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      <main className="flex-1 flex overflow-hidden">
        {activeTab === "board" && (
          <TaskBoard
            onOpenVoiceModal={() => {
              setExtractingTranscript(undefined);
              setExtractingMsgId(undefined);
              setIsVoiceModalOpen(true);
            }}
            onOpenDocModal={() => setIsDocModalOpen(true)}
          />
        )}
        {activeTab === "communications" && (
          <ChatView onExtractTaskFromMessage={handleExtractTaskFromMessage} />
        )}
        {activeTab === "my-tasks" && <MyTasksView />}
        {activeTab === "memory" && <TeamMemoryView />}
        {activeTab === "documents" && (
          <DocumentsView onOpenDocModal={() => setIsDocModalOpen(true)} />
        )}
      </main>

      {/* Voice & AI Task Extraction Modal */}
      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => {
          setIsVoiceModalOpen(false);
          setExtractingTranscript(undefined);
          setExtractingMsgId(undefined);
        }}
        initialTranscript={extractingTranscript}
        initialMessageId={extractingMsgId}
        onTasksCommitted={() => {
          // Switch to board to see the new tasks immediately
          setActiveTab("board");
        }}
      />

      {/* Document Analyzer Modal */}
      <DocumentAnalyzerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onTasksCommitted={() => {
          setActiveTab("board");
        }}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <PlateApp />
    </AuthProvider>
  );
}

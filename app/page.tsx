"use client";

import React, { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { BackStackProvider, useBackStack } from "@/lib/back-stack";
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
  const { activeTab, setActiveTab } = useBackStack();

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);

  const handleTasksCommitted = () => {
    setBoardRefreshKey((prev) => prev + 1);
    setActiveTab("board");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("plate:tasks_updated"));
    }
  };

  // Message extraction context
  const [extractingTranscript, setExtractingTranscript] = useState<string | undefined>(undefined);
  const [extractingMsgId, setExtractingMsgId] = useState<number | undefined>(undefined);
  const [extractingAudioUrl, setExtractingAudioUrl] = useState<string | undefined>(undefined);
  const [extractingAudioFileName, setExtractingAudioFileName] = useState<string | undefined>(undefined);

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
    const isAudio =
      message.message_type === "audio" ||
      Boolean(message.audio_url) ||
      (message.message_type === "file" &&
        Boolean(
          message.file_name?.match(/\.(webm|mp3|wav|ogg|m4a|aac|flac)$/i) ||
            message.content_type?.startsWith("audio/")
        ));

    const audioUrl =
      message.audio_url ||
      (isAudio ? message.file_url || (message as any).file || (message as any).audio_file : undefined);

    const fileName =
      message.file_name ||
      (message.message_type === "audio" ? "voice_note.webm" : "audio_recording.webm");

    setExtractingTranscript(message.content);
    setExtractingMsgId(message.id);
    setExtractingAudioUrl(audioUrl);
    setExtractingAudioFileName(audioUrl ? fileName : undefined);
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
          setExtractingAudioUrl(undefined);
          setExtractingAudioFileName(undefined);
          setIsVoiceModalOpen(true);
        }}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      <main className="flex-1 flex overflow-hidden">
        {activeTab === "board" && (
          <TaskBoard
            refreshKey={boardRefreshKey}
            onOpenVoiceModal={() => {
              setExtractingTranscript(undefined);
              setExtractingMsgId(undefined);
              setExtractingAudioUrl(undefined);
              setExtractingAudioFileName(undefined);
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
          setExtractingAudioUrl(undefined);
          setExtractingAudioFileName(undefined);
        }}
        initialTranscript={extractingTranscript}
        initialMessageId={extractingMsgId}
        initialAudioUrl={extractingAudioUrl}
        initialAudioFileName={extractingAudioFileName}
        onTasksCommitted={handleTasksCommitted}
      />

      {/* Document Analyzer Modal */}
      <DocumentAnalyzerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onTasksCommitted={handleTasksCommitted}
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
      <BackStackProvider>
        <PlateApp />
      </BackStackProvider>
    </AuthProvider>
  );
}

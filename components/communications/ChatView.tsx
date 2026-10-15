"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, WorkspaceMember } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Hash,
  Lock,
  Plus,
  Send,
  Mic,
  Square,
  Paperclip,
  MessageSquare,
  Search,
  MoreVertical,
  Play,
  Pause,
  Download,
  Sparkles,
  ArrowUp,
  X,
  UserCheck,
  Menu,
  Trash2,
  Ban,
} from "lucide-react";
import clsx from "clsx";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

export interface MessageItem {
  id: number;
  conversation: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
  parent_message: number | null;
  message_type: "text" | "audio" | "file";
  content: string;
  audio_url?: string;
  audio_duration?: number;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  content_type?: string;
  is_edited: boolean;
  is_deleted?: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
  isOptimistic?: boolean;
}

export interface ConversationItem {
  id: string;
  workspace: string;
  type: "channel" | "dm" | "group";
  name: string;
  topic: string;
  is_private: boolean;
  display_name: string;
  last_message?: {
    id: number;
    sender_name: string;
    content: string;
    message_type: string;
    created_at: string;
  };
}

interface ChatViewProps {
  onExtractTaskFromMessage?: (message: MessageItem) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ onExtractTaskFromMessage }) => {
  const { user, members, activeWorkspace } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Message composer
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageItem[]>([]);

  // Threads
  const [activeThreadParent, setActiveThreadParent] = useState<MessageItem | null>(null);
  const [threadReplies, setThreadReplies] = useState<MessageItem[]>([]);
  const [threadInput, setThreadInput] = useState("");

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Create Channel / DM Dialog
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"channel" | "dm">("channel");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [selectedDmMemberId, setSelectedDmMemberId] = useState<string>("");
  const [isMobileChannelsOpen, setIsMobileChannelsOpen] = useState(false);

  // --- STRICT INCREMENTAL 2-SECOND POLLING ENGINE ---
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);
  const latestMessageIdRef = useRef<number>(0);
  const activeConvIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    if (!activeWorkspace) return;
    try {
      const data = await apiRequest<ConversationItem[]>("/api/communications/conversations/");
      setConversations(data);
      if (!activeConversation && data.length > 0) {
        setActiveConversation(data[0]);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeWorkspace]);

  // 2. Incremental Poll Routine
  const runIncrementalPoll = useCallback(async () => {
    const convId = activeConvIdRef.current;
    if (!convId || document.hidden || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    try {
      const cursor = latestMessageIdRef.current;
      const data = await apiRequest<{
        results: MessageItem[];
        latest_id: number;
        poll_cursor: number;
        deleted_ids?: number[];
      }>(`/api/communications/conversations/${convId}/messages/?after_id=${cursor}`);

      if (data.results && data.results.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = data.results.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          return [...prev, ...fresh];
        });
        latestMessageIdRef.current = Math.max(latestMessageIdRef.current, data.latest_id);
      }

      // Real-time synchronization of deleted messages across all users
      if (data.deleted_ids && Array.isArray(data.deleted_ids) && data.deleted_ids.length > 0) {
        const deletedSet = new Set(data.deleted_ids);
        setMessages((prev) =>
          prev.map((m) =>
            deletedSet.has(m.id) && !m.is_deleted
              ? {
                  ...m,
                  is_deleted: true,
                  content: "This message was deleted",
                  audio_url: undefined,
                  file_url: undefined,
                }
              : m
          )
        );
        setThreadReplies((prev) =>
          prev.map((m) =>
            deletedSet.has(m.id) && !m.is_deleted
              ? {
                  ...m,
                  is_deleted: true,
                  content: "This message was deleted",
                  audio_url: undefined,
                  file_url: undefined,
                }
              : m
          )
        );
        if (activeThreadParent && deletedSet.has(activeThreadParent.id) && !activeThreadParent.is_deleted) {
          setActiveThreadParent((prev) =>
            prev
              ? {
                  ...prev,
                  is_deleted: true,
                  content: "This message was deleted",
                  audio_url: undefined,
                  file_url: undefined,
                }
              : null
          );
        }
      }
    } catch (err) {
      // Graceful poll failure without disrupting conversation
      console.warn("Incremental poll cycle skipped due to network/auth refresh", err);
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // 3. Conversation Change & Polling Setup
  useEffect(() => {
    if (!activeConversation) return;

    activeConvIdRef.current = activeConversation.id;
    latestMessageIdRef.current = 0;
    setIsLoadingMessages(true);
    setMessages([]);

    // Clear previous polling timer
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    // Initial message history load (latest 50 messages)
    apiRequest<{
      results: MessageItem[];
      latest_id: number;
      has_more_older: boolean;
    }>(`/api/communications/conversations/${activeConversation.id}/messages/?limit=50`)
      .then((res) => {
        setMessages(res.results || []);
        setHasMoreOlder(res.has_more_older || false);
        latestMessageIdRef.current = res.latest_id || 0;
        // Start 2-second incremental polling interval
        pollTimerRef.current = setInterval(runIncrementalPoll, 2000);
      })
      .catch((err) => console.error("Failed to load conversation history", err))
      .finally(() => setIsLoadingMessages(false));

    // Handle tab visibility pause & resume
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab visible -> immediate incremental sync
        runIncrementalPoll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeConversation?.id, runIncrementalPoll]);

  // Scroll to bottom on initial load or new incoming messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Load older messages (upward pagination)
  const handleLoadOlder = async () => {
    if (!activeConversation || messages.length === 0 || isLoadingOlder) return;
    setIsLoadingOlder(true);
    const oldestId = messages[0].id;

    try {
      const data = await apiRequest<{
        results: MessageItem[];
        has_more_older: boolean;
      }>(
        `/api/communications/conversations/${activeConversation.id}/messages/?before_id=${oldestId}&limit=30`
      );
      if (data.results && data.results.length > 0) {
        setMessages((prev) => [...data.results, ...prev]);
        setHasMoreOlder(data.has_more_older);
      } else {
        setHasMoreOlder(false);
      }
    } catch (err) {
      console.error("Failed to load older messages", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || !inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Optimistic message
    const tempId = Date.now();
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversation: activeConversation.id,
      sender: {
        id: user?.id || "",
        name: user?.name || "Me",
        email: user?.email || "",
      },
      parent_message: null,
      message_type: "text",
      content,
      is_edited: false,
      reply_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const saved = await apiRequest<MessageItem>(
        `/api/communications/conversations/${activeConversation.id}/messages/`,
        {
          method: "POST",
          body: JSON.stringify({ content, message_type: "text" }),
        }
      );
      // Replace optimistic message with actual persisted message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      latestMessageIdRef.current = Math.max(latestMessageIdRef.current, saved.id);
    } catch (err) {
      console.error("Failed to send message", err);
      // Mark as error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("message_type", "file");

    try {
      const saved = await apiRequest<MessageItem>(
        `/api/communications/conversations/${activeConversation.id}/messages/`,
        {
          method: "POST",
          body: formData,
        }
      );
      setMessages((prev) => [...prev, saved]);
      latestMessageIdRef.current = Math.max(latestMessageIdRef.current, saved.id);
    } catch (err) {
      console.error("Failed to upload attachment", err);
    }
  };

  // Audio Recording (Voice Notes)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await sendAudioMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Audio recording permission denied or unavailable", err);
      alert("Microphone access is required to record voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const sendAudioMessage = async (blob: Blob) => {
    if (!activeConversation) return;
    const formData = new FormData();
    formData.append("audio_file", blob, "voice_message.webm");
    formData.append("message_type", "audio");
    formData.append("audio_duration", recordingSeconds.toString());

    try {
      const saved = await apiRequest<MessageItem>(
        `/api/communications/conversations/${activeConversation.id}/messages/`,
        {
          method: "POST",
          body: formData,
        }
      );
      setMessages((prev) => [...prev, saved]);
      latestMessageIdRef.current = Math.max(latestMessageIdRef.current, saved.id);
    } catch (err) {
      console.error("Failed to send audio message", err);
    }
  };

  // Audio Playback
  const togglePlayAudio = (id: number, url?: string) => {
    if (!url) return;
    if (playingAudioId === id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.play();
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Delete message for all
  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm("Are you sure you want to delete this message for everyone?")) {
      return;
    }

    // Optimistically update locally
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              is_deleted: true,
              content: "This message was deleted",
              audio_url: undefined,
              file_url: undefined,
            }
          : m
      )
    );
    setThreadReplies((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              is_deleted: true,
              content: "This message was deleted",
              audio_url: undefined,
              file_url: undefined,
            }
          : m
      )
    );
    if (activeThreadParent && activeThreadParent.id === msgId) {
      setActiveThreadParent((prev) =>
        prev
          ? {
              ...prev,
              is_deleted: true,
              content: "This message was deleted",
              audio_url: undefined,
              file_url: undefined,
            }
          : null
      );
    }

    try {
      await apiRequest(`/api/communications/messages/${msgId}/`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // Open Thread
  const openThread = async (msg: MessageItem) => {
    setActiveThreadParent(msg);
    try {
      const data = await apiRequest<{ results: MessageItem[] }>(
        `/api/communications/conversations/${msg.conversation}/messages/?parent_id=${msg.id}`
      );
      setThreadReplies(data.results || []);
    } catch (err) {
      console.error("Failed to load thread replies", err);
    }
  };

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadParent || !threadInput.trim()) return;

    try {
      const reply = await apiRequest<MessageItem>(
        `/api/communications/conversations/${activeThreadParent.conversation}/messages/`,
        {
          method: "POST",
          body: JSON.stringify({
            content: threadInput.trim(),
            parent_id: activeThreadParent.id,
          }),
        }
      );
      setThreadReplies((prev) => [...prev, reply]);
      setThreadInput("");
      // Increment reply count on parent
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeThreadParent.id ? { ...m, reply_count: m.reply_count + 1 } : m
        )
      );
    } catch (err) {
      console.error("Failed to send thread reply", err);
    }
  };

  // Create Channel or DM
  const handleCreateConversation = async () => {
    if (createType === "channel") {
      if (!newChannelName.trim()) return;
      try {
        const conv = await apiRequest<ConversationItem>(
          "/api/communications/conversations/",
          {
            method: "POST",
            body: JSON.stringify({
              type: "channel",
              name: newChannelName.trim(),
              topic: newChannelTopic.trim(),
            }),
          }
        );
        setConversations((prev) => [conv, ...prev]);
        setActiveConversation(conv);
        setShowCreateModal(false);
        setNewChannelName("");
        setNewChannelTopic("");
      } catch (err) {
        console.error("Failed to create channel", err);
      }
    } else {
      if (!selectedDmMemberId) return;
      try {
        const selectedMember = members.find((m) => m.id === selectedDmMemberId);
        if (!selectedMember) return;
        const conv = await apiRequest<ConversationItem>(
          "/api/communications/conversations/",
          {
            method: "POST",
            body: JSON.stringify({
              type: "dm",
              target_user_id: selectedMember.user.id,
            }),
          }
        );
        setConversations((prev) => [conv, ...prev]);
        setActiveConversation(conv);
        setShowCreateModal(false);
      } catch (err) {
        console.error("Failed to start DM", err);
      }
    }
  };

  const channels = conversations.filter((c) => c.type === "channel");
  const directMessages = conversations.filter((c) => c.type === "dm");

  const renderChannelsList = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between bg-neutral-50/70">
      <div className="flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <span className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
            Communications
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCreateType("channel");
                setShowCreateModal(true);
                if (isMobile) setIsMobileChannelsOpen(false);
              }}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors flex-shrink-0"
              title="Create Channel or Direct Message"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
            </button>
            {isMobile && (
              <button
                onClick={() => setIsMobileChannelsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 flex-shrink-0"
              >
                <X className="w-5 h-5 flex-shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Channels Section */}
        <div className="p-3">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider px-2 mb-1.5">
            <span>Channels</span>
            <span className="text-xs font-mono">{channels.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConversation(c);
                  if (isMobile) setIsMobileChannelsOpen(false);
                }}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors",
                  c.id === activeConversation?.id
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100"
                )}
              >
                <Hash className="w-4 h-4 opacity-60 flex-shrink-0" />
                <span className="line-clamp-1">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="p-3 pt-0">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider px-2 mb-1.5">
            <span>Direct Messages</span>
            <button
              onClick={() => {
                setCreateType("dm");
                setShowCreateModal(true);
                if (isMobile) setIsMobileChannelsOpen(false);
              }}
              className="text-neutral-400 hover:text-neutral-700 p-0.5"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {directMessages.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConversation(c);
                  if (isMobile) setIsMobileChannelsOpen(false);
                }}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors",
                  c.id === activeConversation?.id
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 flex-shrink-0" />
                <span className="line-clamp-1">{c.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Polling Health Indicator */}
      <div className="p-3 border-t border-neutral-200 text-xs text-neutral-400 font-mono flex items-center justify-between bg-white">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="line-clamp-1">2s Sync Active</span>
        </span>
        <span className="flex-shrink-0">Stateless</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex h-[calc(100vh-3.5rem)] overflow-hidden bg-white">
      {/* 1. Desktop Conversations Sidebar */}
      <div className="hidden md:flex w-64 shrink-0 border-r border-neutral-200 flex-col justify-between">
        {renderChannelsList(false)}
      </div>

      {/* Mobile Channels Drawer Overlay */}
      {isMobileChannelsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileChannelsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderChannelsList(true)}
          </div>
        </div>
      )}

      {/* 2. Main Conversation Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-neutral-200 px-4 md:px-6 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileChannelsOpen(true)}
                  className="md:hidden p-1.5 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 flex-shrink-0"
                  title="Open Channels"
                >
                  <Menu className="w-5 h-5 flex-shrink-0" />
                </button>

                <span className="text-base font-bold text-neutral-950 flex items-center gap-2">
                  {activeConversation.type === "channel" ? (
                    <Hash className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  )}
                  <span className="line-clamp-1">{activeConversation.display_name}</span>
                </span>
                {activeConversation.topic && (
                  <span className="hidden lg:inline text-xs text-neutral-400 truncate max-w-md border-l border-neutral-200 pl-3">
                    {activeConversation.topic}
                  </span>
                )}
              </div>

              {/* Polling Pulse Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                  cursor #{latestMessageIdRef.current}
                </span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {hasMoreOlder && (
                <div className="flex justify-center mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadOlder}
                    isLoading={isLoadingOlder}
                    className="text-xs text-neutral-500"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Load older messages</span>
                  </Button>
                </div>
              )}

              {messages.map((msg) => {
                const isOwn = msg.sender.id === user?.id;

                return (
                  <div
                    key={msg.id}
                    className={clsx(
                      "group flex items-start gap-3 rounded-xl p-2.5 hover:bg-neutral-50/80 transition-colors",
                      msg.isOptimistic && "opacity-60"
                    )}
                  >
                    <Avatar name={msg.sender.name} size="sm" />

                    <div className="flex-1 min-w-0">
                      {/* Sender & Timestamp */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-neutral-900">
                          {msg.sender.name}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.is_edited && (
                          <span className="text-xs text-neutral-400 italic">edited</span>
                        )}
                      </div>

                      {/* Message Content or Deleted State */}
                      {msg.is_deleted || msg.content === "This message was deleted" ? (
                        <p className="text-sm text-neutral-400 italic flex items-center gap-1.5 mt-1 select-none">
                          <Ban className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          <span>This message was deleted</span>
                        </p>
                      ) : (
                        <>
                          {msg.message_type === "text" && (
                            <p className="text-sm text-neutral-800 leading-relaxed break-words whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}

                          {msg.message_type === "audio" && (
                            <VoiceNotePlayer
                              audioUrl={msg.audio_url || (msg as any).audio_file}
                              duration={msg.audio_duration}
                              messageId={msg.id}
                              activePlayingId={playingAudioId}
                              onPlay={(id) => setPlayingAudioId(id)}
                              onPause={() => setPlayingAudioId(null)}
                            />
                          )}

                          {msg.message_type === "file" && (
                            <a
                              href={msg.file_url || (msg as any).file}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2.5 p-3 rounded-xl bg-white shadow-[0px_0px_25px_rgba(0,0,0,0.08)] hover:shadow-[0px_0px_30px_rgba(0,0,0,0.12)] transition-all text-sm text-neutral-900 mt-1.5 max-w-sm"
                            >
                              <Paperclip className="w-4 h-4 text-neutral-500 shrink-0 flex-shrink-0" />
                              <span className="line-clamp-1 font-medium">{msg.file_name || "Attachment"}</span>
                              <Download className="w-4 h-4 text-neutral-400 ml-auto flex-shrink-0" />
                            </a>
                          )}

                          {/* Actions Bar on Hover */}
                          <div className="mt-1 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openThread(msg)}
                              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-neutral-100"
                            >
                              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="line-clamp-1">
                                {msg.reply_count > 0 ? `${msg.reply_count} replies` : "Reply in thread"}
                              </span>
                            </button>

                            <button
                              onClick={() => onExtractTaskFromMessage && onExtractTaskFromMessage(msg)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-blue-50"
                            >
                              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="line-clamp-1">Extract Task</span>
                            </button>

                            {msg.sender.id === user?.id && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-red-50 transition-colors"
                                title="Delete for everyone"
                              >
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="line-clamp-1">Delete</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-neutral-200 bg-white">
              {isRecording ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 text-red-700 shadow-[0px_0px_25px_rgba(239,68,68,0.1)]">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping flex-shrink-0" />
                    <span>Recording Voice Message: {recordingSeconds}s</span>
                  </div>
                  <Button variant="danger" size="sm" onClick={stopRecording}>
                    <Square className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="line-clamp-1">Stop & Send</span>
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                >
                  <label className="cursor-pointer p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0">
                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors flex-shrink-0"
                    title="Record voice message"
                  >
                    <Mic className="w-4 h-4 flex-shrink-0" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${activeConversation.display_name}...`}
                    className="flex-1 text-sm sm:text-base text-neutral-900 border-none p-1 focus:outline-none placeholder:text-neutral-400"
                  />

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputText.trim() || isSending}
                    isLoading={isSending}
                    className="shrink-0 flex-shrink-0"
                  >
                    <Send className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400 text-sm">
            <MessageSquare className="w-12 h-12 text-neutral-300 mb-3 flex-shrink-0" />
            <h3 className="text-base font-bold text-neutral-700">Select a Conversation</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">
              Choose a channel or team member direct message to start chatting and extracting tasks.
            </p>
            <button
              onClick={() => setIsMobileChannelsOpen(true)}
              className="mt-4 md:hidden px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold"
            >
              <span className="line-clamp-1">View Channels</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Thread Replies Drawer / Modal */}
      {activeThreadParent && (
        <>
          {/* Mobile Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
            onClick={() => setActiveThreadParent(null)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 md:relative md:inset-auto md:z-20 md:w-80 lg:w-96 shrink-0 bg-white flex flex-col md:border-l md:border-neutral-200 shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
            {/* Thread Header */}
            <div className="h-14 sm:h-16 px-4 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base font-bold text-neutral-950">Thread</span>
                {activeConversation && (
                  <span className="text-xs text-neutral-500 truncate max-w-[150px]">
                    in #{activeConversation.name}
                  </span>
                )}
                {threadReplies.length > 0 && (
                  <Badge variant="neutral" size="sm">
                    {threadReplies.length}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveThreadParent(null)}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors flex-shrink-0"
                aria-label="Close thread"
              >
                <X className="w-5 h-5 flex-shrink-0" />
              </button>
            </div>

            {/* Parent Original Message */}
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/70 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar name={activeThreadParent.sender.name} size="sm" />
                  <span className="text-sm font-bold text-neutral-900">
                    {activeThreadParent.sender.name}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(activeThreadParent.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {activeThreadParent.is_deleted || activeThreadParent.content === "This message was deleted" ? (
                <p className="text-sm text-neutral-400 italic flex items-center gap-1.5 select-none">
                  <Ban className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  <span>This message was deleted</span>
                </p>
              ) : (
                <p className="text-sm text-neutral-800 leading-relaxed font-normal">
                  {activeThreadParent.content}
                </p>
              )}
            </div>

            {/* Thread Replies List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
              {threadReplies.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-400">
                  No replies yet. Start the thread conversation!
                </div>
              ) : (
                threadReplies.map((r) => {
                  const isDeleted = r.is_deleted || r.content === "This message was deleted";
                  return (
                    <div key={r.id} className="group/reply flex items-start gap-2.5 text-sm">
                      <Avatar name={r.sender.name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-neutral-900 text-sm truncate">{r.sender.name}</span>
                            <span className="text-[11px] text-neutral-400 flex-shrink-0">
                              {new Date(r.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {!isDeleted && r.sender.id === user?.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(r.id)}
                              className="opacity-0 group-hover/reply:opacity-100 text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all"
                              title="Delete reply"
                            >
                              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                            </button>
                          )}
                        </div>
                        {isDeleted ? (
                          <p className="text-xs text-neutral-400 italic flex items-center gap-1 mt-0.5 select-none">
                            <Ban className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                            <span>This message was deleted</span>
                          </p>
                        ) : (
                          <p className="text-neutral-700 text-sm leading-relaxed">{r.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Thread Reply Composer */}
            <form onSubmit={handleSendThreadReply} className="p-3 sm:p-4 border-t border-neutral-200 bg-white flex items-center gap-2 shrink-0 pb-safe">
              <input
                type="text"
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
                placeholder="Reply in thread..."
                className="flex-1 h-10 px-3.5 text-base sm:text-sm bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:bg-white focus:border-neutral-900 transition-colors"
              />
              <Button size="sm" type="submit" disabled={!threadInput.trim()} className="h-10 px-4">
                <span className="line-clamp-1 text-start">Reply</span>
              </Button>
            </form>
          </div>
        </>
      )}

      {/* Create Channel / DM Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-[0px_0px_30px_rgba(0,0,0,0.15)] max-w-sm w-full p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-neutral-950">
              {createType === "channel" ? "Create New Channel" : "Start Direct Message"}
            </h3>

            {createType === "channel" ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="channel-name (e.g. project-apollo)"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="h-10 px-3.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Topic / purpose (optional)"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  className="h-10 px-3.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Select Member:</label>
                <select
                  value={selectedDmMemberId}
                  onChange={(e) => setSelectedDmMemberId(e.target.value)}
                  className="h-10 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none"
                >
                  <option value="">Select a member...</option>
                  {members
                    .filter((m) => m.user.id !== user?.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.name} ({m.title || m.role})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button size="sm" variant="ghost" onClick={() => setShowCreateModal(false)}>
                <span className="line-clamp-1">Cancel</span>
              </Button>
              <Button size="sm" onClick={handleCreateConversation}>
                <span className="line-clamp-1">{createType === "channel" ? "Create Channel" : "Start Chat"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

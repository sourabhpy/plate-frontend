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
} from "lucide-react";
import clsx from "clsx";

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

  return (
    <div className="flex-1 flex h-[calc(100vh-3.5rem)] overflow-hidden bg-white">
      {/* 1. Conversations Sidebar (Slack-style Minimalist) */}
      <div className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50/50 flex flex-col justify-between">
        <div className="flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Communications
            </span>
            <button
              onClick={() => {
                setCreateType("channel");
                setShowCreateModal(true);
              }}
              className="p-1 rounded hover:bg-neutral-200 text-neutral-600 transition-colors"
              title="Create Channel or Direct Message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Channels Section */}
          <div className="p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-1">
              <span>Channels</span>
              <span className="text-[10px]">{channels.length}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {channels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConversation(c)}
                  className={clsx(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors",
                    c.id === activeConversation?.id
                      ? "bg-black text-white font-semibold"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <Hash className="w-3.5 h-3.5 opacity-60" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div className="p-3 pt-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2 mb-1">
              <span>Direct Messages</span>
              <button
                onClick={() => {
                  setCreateType("dm");
                  setShowCreateModal(true);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {directMessages.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConversation(c)}
                  className={clsx(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors",
                    c.id === activeConversation?.id
                      ? "bg-black text-white font-semibold"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{c.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Polling Health Indicator */}
        <div className="p-3 border-t border-neutral-200 text-[10px] text-neutral-400 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>2s HTTP Sync Active</span>
          </span>
          <span>Stateless</span>
        </div>
      </div>

      {/* 2. Main Conversation Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-neutral-200 px-6 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-neutral-950 flex items-center gap-1.5">
                  {activeConversation.type === "channel" ? (
                    <Hash className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  )}
                  {activeConversation.display_name}
                </span>
                {activeConversation.topic && (
                  <span className="hidden md:inline text-xs text-neutral-400 truncate max-w-md border-l border-neutral-200 pl-3">
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
                      "group flex items-start gap-3 rounded-lg p-2 hover:bg-neutral-50/80 transition-colors",
                      msg.isOptimistic && "opacity-60"
                    )}
                  >
                    <Avatar name={msg.sender.name} size="sm" />

                    <div className="flex-1 min-w-0">
                      {/* Sender & Timestamp */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-neutral-900">
                          {msg.sender.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.is_edited && (
                          <span className="text-[9px] text-neutral-400 italic">edited</span>
                        )}
                      </div>

                      {/* Message Content by Type */}
                      {msg.message_type === "text" && (
                        <p className="text-xs text-neutral-800 leading-relaxed break-words whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}

                      {msg.message_type === "audio" && (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 max-w-sm mt-1">
                          <button
                            onClick={() => togglePlayAudio(msg.id, msg.audio_url || (msg as any).audio_file)}
                            className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shrink-0"
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1 flex flex-col">
                            <span className="text-xs font-semibold text-neutral-900">Voice Note</span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {msg.audio_duration ? `${Math.round(msg.audio_duration)}s audio` : "Audio message"}
                            </span>
                          </div>
                        </div>
                      )}

                      {msg.message_type === "file" && (
                        <a
                          href={msg.file_url || (msg as any).file}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors text-xs text-neutral-900 mt-1 max-w-sm"
                        >
                          <Paperclip className="w-4 h-4 text-neutral-500 shrink-0" />
                          <span className="truncate font-medium">{msg.file_name || "Attachment"}</span>
                          <Download className="w-3.5 h-3.5 text-neutral-400 ml-auto" />
                        </a>
                      )}

                      {/* Actions Bar on Hover */}
                      <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openThread(msg)}
                          className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{msg.reply_count > 0 ? `${msg.reply_count} replies` : "Reply in thread"}</span>
                        </button>

                        <button
                          onClick={() => onExtractTaskFromMessage && onExtractTaskFromMessage(msg)}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-2"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Extract Task</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-neutral-200 bg-white">
              {isRecording ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                    <span>Recording Voice Message: {recordingSeconds}s</span>
                  </div>
                  <Button variant="danger" size="sm" onClick={stopRecording}>
                    <Square className="w-3 h-3" />
                    <span>Stop & Send</span>
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                >
                  <label className="cursor-pointer p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors"
                    title="Record voice message"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${activeConversation.display_name}...`}
                    className="flex-1 text-xs text-neutral-900 border-none p-1 focus:outline-none placeholder:text-neutral-400"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-1.5 rounded-md bg-black text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
            Select or create a conversation to start chatting
          </div>
        )}
      </div>

      {/* 3. Thread Replies Drawer */}
      {activeThreadParent && (
        <div className="w-80 shrink-0 border-l border-neutral-200 bg-white flex flex-col">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-900">Thread</span>
            <button
              onClick={() => setActiveThreadParent(null)}
              className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2 mb-1">
              <Avatar name={activeThreadParent.sender.name} size="xs" />
              <span className="text-xs font-bold text-neutral-900">
                {activeThreadParent.sender.name}
              </span>
            </div>
            <p className="text-xs text-neutral-700">{activeThreadParent.content}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {threadReplies.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-xs">
                <Avatar name={r.sender.name} size="xs" />
                <div className="flex-1">
                  <span className="font-semibold text-neutral-900">{r.sender.name}</span>
                  <p className="text-neutral-700 mt-0.5">{r.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendThreadReply} className="p-3 border-t border-neutral-200 flex gap-2">
            <input
              type="text"
              value={threadInput}
              onChange={(e) => setThreadInput(e.target.value)}
              placeholder="Reply..."
              className="flex-1 h-8 text-xs border border-neutral-200 rounded px-2.5 focus:outline-none focus:border-blue-500"
            />
            <Button size="sm" type="submit" disabled={!threadInput.trim()}>
              Reply
            </Button>
          </form>
        </div>
      )}

      {/* Create Channel / DM Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-sm w-full p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-neutral-950">
              {createType === "channel" ? "Create New Channel" : "Start Direct Message"}
            </h3>

            {createType === "channel" ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="channel-name (e.g. project-apollo)"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="h-9 px-3 text-xs border border-neutral-200 rounded-md focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Topic / purpose (optional)"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  className="h-9 px-3 text-xs border border-neutral-200 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-600">Select Member:</label>
                <select
                  value={selectedDmMemberId}
                  onChange={(e) => setSelectedDmMemberId(e.target.value)}
                  className="h-9 px-3 text-xs border border-neutral-200 rounded-md focus:outline-none"
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
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateConversation}>
                {createType === "channel" ? "Create Channel" : "Start Chat"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

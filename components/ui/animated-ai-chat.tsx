"use client";

import { useEffect, useRef, useCallback, useTransition, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Command,
  SendIcon,
  XIcon,
  LoaderIcon,
  Paperclip,
  Lightbulb,
  Workflow,
  CalendarRange,
  Crosshair,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import Folder from "@/components/ui/folder";
import { FounderWizard, type WizardAnswers } from "@/components/founder/FounderWizard";
import { useRouter } from "next/navigation";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: ModelChoice;
};

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? "";
type ModelChoice = "codex" | "opus" | "venice";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className,
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export function AnimatedAIChat() {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const router = useRouter();
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 480,
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [status, setStatus] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [model, setModel] = useState<ModelChoice>("venice");
  /** Index of folder paper (0–2) while Venice generates a profile prompt */
  const [folderPaperBusy, setFolderPaperBusy] = useState<number | null>(null);
  /** Wizard stepper generating state */
  const [wizardGenerating, setWizardGenerating] = useState(false);
  /** Top-level view: form (wizard+folder) vs chat */
  const [viewMode, setViewMode] = useState<"form" | "chat">("form");
  /** Convex ignition draft ready — show OpenClaw handoff (same as /chats). */
  const [ignitionReady, setIgnitionReady] = useState(false);
  const [handoffStarting, setHandoffStarting] = useState(false);
  const [existingOfficeSessionId, setExistingOfficeSessionId] = useState<string | null>(null);
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (DASHBOARD_TOKEN) headers["x-dashboard-token"] = DASHBOARD_TOKEN;
    return headers;
  }, []);

  useEffect(() => {
    const savedModel = localStorage.getItem("avril-dashboard:model-home") as ModelChoice | null;
    if (savedModel === "codex" || savedModel === "opus" || savedModel === "venice") {
      setModel(savedModel);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("avril-dashboard:model-home", model);
  }, [model]);

  const modelLabel = model === "venice" ? "Venice" : model === "codex" ? "OpenClaw (Codex)" : "OpenClaw (Opus)";
  const typingLabel = model === "venice" ? "Venice thinking" : "OpenClaw thinking";

  const commandSuggestions: CommandSuggestion[] = [
    { icon: <Lightbulb className="w-4 h-4" />, label: "Validate Idea", description: "Test-check a startup concept", prefix: "Validate my startup idea: " },
    { icon: <Workflow className="w-4 h-4" />, label: "Agent Workflow", description: "Design an agentic ops flow", prefix: "Design an agent workflow that " },
    { icon: <CalendarRange className="w-4 h-4" />, label: "90-Day Plan", description: "Actionable launch roadmap", prefix: "Build a 90-day launch plan for " },
    { icon: <Crosshair className="w-4 h-4" />, label: "Find My Niche", description: "Discover a profitable niche", prefix: "Help me pick a niche for an agentic business in " },
  ];

  const folderPaperLabels = useMemo(
    () =>
      (["Conservative", "Balanced", "Ambitious"] as const).map((label) => (
        <span
          key={label}
          className="flex h-full min-h-0 w-full max-w-full items-center justify-center px-0.5 py-0.5 text-center text-[5px] font-medium uppercase tracking-tight leading-none text-neutral-600 pointer-events-none sm:text-[6px]"
        >
          {label}
        </span>
      )),
    [],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      setActiveSuggestion(0);
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector("[data-command-button]");
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(target) && !commandButton?.contains(target)) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function ensureChatId(): Promise<string | null> {
    if (chatId) return chatId;
    try {
      const res = await fetch("/api/chat/create", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          title: "Home Venice Chat",
          area: "General",
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as { error?: string }));
        const msg = typeof payload?.error === "string" ? payload.error : "Could not initialize Venice chat session.";
        setStatus(res.status === 401 ? "Unauthorized chat session request. Check dashboard token/session." : msg);
        return null;
      }
      const data = await res.json();
      const createdId = typeof data?.chatId === "string" ? data.chatId : null;
      setChatId(createdId);
      return createdId;
    } catch {
      setStatus("Network error creating chat session.");
      return null;
    }
  }

  const pastePromptToInput = useCallback(
    (text: string) => {
      setValue(text);
      setViewMode("chat");
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        adjustHeight();
      });
    },
    [adjustHeight],
  );

  const handleFolderProfileClick = useCallback(
    async (index: number) => {
      if (folderPaperBusy !== null) return;
      const profiles = ["conservative", "balanced", "ambitious"] as const;
      const profile = profiles[index];
      if (!profile) return;

      const posture = profile.charAt(0).toUpperCase() + profile.slice(1);
      setFolderPaperBusy(index);
      setStatus("");
      setViewMode("chat");
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-gen-start`,
          role: "assistant",
          model: "venice",
          content: `Generating your ${posture} agent brief — it will appear in the input box so you can edit before sending.`,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const context = messages
          .slice(-10)
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n");

        const res = await fetch("/api/chat/folder-profile-prompt", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ profile, context }),
        });

        const data = await res.json().catch(() => ({} as { error?: { message?: string }; prompt?: string }));
        if (!res.ok) {
          setStatus(typeof data?.error?.message === "string" ? data.error.message : "Could not generate idea prompt.");
          return;
        }

        const prompt = typeof data?.prompt === "string" ? data.prompt : "";
        if (!prompt.trim()) {
          setStatus("Venice returned an empty prompt.");
          return;
        }

        setViewMode("chat");
      pastePromptToInput(prompt);
      } catch {
        setStatus("Network error generating prompt.");
      } finally {
        setFolderPaperBusy(null);
      }
    },
    [authHeaders, folderPaperBusy, messages, pastePromptToInput],
  );

  const handleWizardGenerate = useCallback(
    async (answers: WizardAnswers) => {
      const posture = (answers.riskTolerance || "balanced").charAt(0).toUpperCase() + (answers.riskTolerance || "balanced").slice(1);
      setWizardGenerating(true);
      setStatus("");
      setViewMode("chat");
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-gen-start`,
          role: "assistant",
          model: "venice",
          content: `Generating your ${posture} agent brief — it will appear in the input box so you can review and edit before sending.`,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const context = [
          `Founder: ${answers.founderName}`,
          `Country: ${answers.country}`,
          `Language: ${answers.language}`,
          `Idea: ${answers.rawIdea}`,
          `Problem: ${answers.problem}`,
          `Target user: ${answers.targetUser}`,
          `Monetization: ${answers.monetization}`,
          `Business model: ${answers.businessModel}`,
          `Risk tolerance: ${answers.riskTolerance}`,
          `Automation level: ${answers.automationLevel}`,
          `Time available: ${answers.timeAvailable}`,
          `Skills/resources: ${answers.skillsResources}`,
          `Channels: ${answers.channels}`,
        ].join("\n");

        const res = await fetch("/api/chat/folder-profile-prompt", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            profile: answers.riskTolerance || "balanced",
            context,
          }),
        });

        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        if (!res.ok) {
          setStatus(typeof data?.error?.message === "string" ? data.error.message : "Could not generate brief.");
          return;
        }

        const prompt = typeof data?.prompt === "string" ? data.prompt : "";
        if (!prompt.trim()) {
          setStatus("Venice returned an empty brief.");
          return;
        }

        pastePromptToInput(prompt);
      } catch {
        setStatus("Network error generating brief.");
      } finally {
        setWizardGenerating(false);
      }
    },
    [authHeaders, pastePromptToInput],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1));
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion];
          setValue(selectedCommand.prefix + " ");
          setShowCommandPalette(false);
          setRecentCommand(selectedCommand.label);
          setTimeout(() => setRecentCommand(null), 3500);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) void handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    const content = value.trim();
    if (!content || isPending || isTyping) return;

    setIgnitionReady(false);
    setExistingOfficeSessionId(null);

    const nowIso = new Date().toISOString();
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: "user", content, createdAt: nowIso }]);
    setStatus("");
    setValue("");
    adjustHeight(true);

    startTransition(() => {
      setIsTyping(true);
    });

    try {
      const resolvedChatId = await ensureChatId();
      if (!resolvedChatId) return;

      const res = await fetch("/api/chat/respond", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          chatId: resolvedChatId,
          message: content,
          model,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`${modelLabel} error: ${data?.error?.message || "request failed"}`);
        return;
      }

      if (data?.ignitionReady) {
        setIgnitionReady(true);
      }

      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (!reply) {
        if (data?.ignitionReady) {
          setStatus("Ignition saved — use “Send to OpenClaw” below (3-swarm guardrails).");
          return;
        }
        setStatus(`${modelLabel} returned an empty response.`);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: "assistant", model, content: reply, createdAt: new Date().toISOString() },
      ]);
    } catch {
      setStatus(`Network error contacting ${modelLabel}.`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleHandoffToOpenClaw = async () => {
    if (!chatId || handoffStarting) return;
    setHandoffStarting(true);
    setExistingOfficeSessionId(null);
    setStatus("");
    try {
      const res = await fetch("/api/orchestration/handoff-openclaw", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ chatId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        const sid = data?.existingSessionId;
        if (sid) setExistingOfficeSessionId(String(sid));
        setStatus(
          typeof data?.error?.message === "string"
            ? data.error.message
            : "This chat was already handed off to OpenClaw.",
        );
        return;
      }
      if (!res.ok) {
        setStatus(typeof data?.error?.message === "string" ? data.error.message : "Handoff failed.");
        return;
      }
      const sessionId = data?.sessionId;
      if (!sessionId) {
        setStatus("Handoff succeeded but no session id returned.");
        return;
      }
      router.push(`/agents/office?sessionId=${encodeURIComponent(sessionId)}`);
    } catch {
      setStatus("Network error during handoff.");
    } finally {
      setHandoffStarting(false);
    }
  };

  const handleAttachFile = () => {
    const mockFileName = `file-${Math.floor(Math.random() * 1000)}.pdf`;
    setAttachments((prev) => [...prev, mockFileName]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index];
    setValue(selectedCommand.prefix);
    setShowCommandPalette(false);
    setRecentCommand(selectedCommand.label);
    setTimeout(() => setRecentCommand(null), 2000);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="min-h-screen flex flex-col w-full items-center bg-transparent text-white p-6 pt-12 relative overflow-hidden lab-bg">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>
      <div className="w-full max-w-2xl mx-auto relative">
        <motion.div
          className="relative z-10 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* ── Header ── */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              className="mx-auto flex w-fit items-center justify-center"
            >
              <Image src="/Avril.png" alt="Avril logo" width={160} height={56} className="opacity-95" priority />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="inline-block">
              <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                What do you want to ship?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
          </div>

          {/* ── Form / Chat toggle ── */}
          <div className="mx-auto flex w-fit rounded-full border border-white/10 bg-white/[0.02] p-0.5">
            {(["form", "chat"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={cn(
                  "rounded-full px-5 py-1.5 text-xs font-medium capitalize transition-all",
                  viewMode === m ? "bg-violet-500/25 text-white" : "text-white/40 hover:text-white/60",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* ── Form view: wizard + folder ── */}
          {viewMode === "form" && (
            <>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
                <FounderWizard onGenerate={handleWizardGenerate} isGenerating={wizardGenerating} />
              </motion.div>

              <div className="flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-white/40">Quick start — tap a card for an instant agent brief</p>
                <div className="relative flex h-[220px] w-full flex-col items-center justify-center gap-2">
                  <Folder
                    color="#5227FF"
                    size={2}
                    className={cn("custom-folder transition-opacity", folderPaperBusy !== null && "opacity-65")}
                    items={folderPaperLabels}
                    onPaperClick={handleFolderProfileClick}
                  />
                  <AnimatePresence>
                    {folderPaperBusy !== null && (
                      <motion.div
                        className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        aria-live="polite"
                      >
                        <LoaderIcon className="h-3.5 w-3.5 animate-[spin_1.5s_linear_infinite] text-violet-300" />
                        <span className="text-xs text-violet-300/90">
                          Venice is drafting your{" "}
                          {folderPaperBusy === 0 ? "conservative" : folderPaperBusy === 1 ? "balanced" : "ambitious"} brief…
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}

          {/* ── Chat view ── */}
          {viewMode === "chat" && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.p className="text-center text-sm text-white/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Model: {modelLabel}
                </motion.p>
                <p className="text-center text-[11px] text-white/35 px-2">
                  Paste or generate an <span className="text-white/50">Agent brief</span>, then <strong className="text-white/60">Send</strong>. When ignition is ready, use{" "}
                  <strong className="text-white/60">Send to OpenClaw</strong> — runtime gets <strong className="text-white/60">3 swarm</strong> guardrails (not 40+ agents).
                </p>

                <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 px-1">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-white/45">Start an agentic startup vibe-founding all the way.</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "max-w-[88%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                          message.role === "user" ? "ml-auto bg-white/10 text-white/90" : "mr-auto bg-violet-500/10 text-white/90 border border-violet-400/20",
                        )}
                      >
                        <p className="text-[11px] text-white/45 mb-1">
                          {message.role === "user"
                            ? "You"
                            : message.model === "venice"
                              ? "Venice"
                              : message.model === "codex"
                                ? "OpenClaw (Codex)"
                                : "OpenClaw (Opus)"}
                        </p>
                        <p>{message.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <motion.div className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl" initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
                  <AnimatePresence>
                    {showCommandPalette && (
                      <motion.div
                        ref={commandPaletteRef}
                        className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="py-1 bg-black/95">
                          {commandSuggestions.map((suggestion, index) => (
                            <motion.div
                              key={suggestion.prefix}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                                activeSuggestion === index ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5",
                              )}
                              onClick={() => selectCommandSuggestion(index)}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.03 }}
                            >
                              <div className="w-5 h-5 flex items-center justify-center text-white/60">{suggestion.icon}</div>
                              <div className="font-medium">{suggestion.label}</div>
                              <div className="text-white/40 text-xs ml-1">{suggestion.description}</div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4">
                    <Textarea
                      ref={textareaRef}
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        adjustHeight();
                      }}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      placeholder={`Ask ${modelLabel} a question...`}
                      containerClassName="w-full"
                      className={cn(
                        "w-full px-4 py-3",
                        "resize-none",
                        "bg-transparent",
                        "border-none",
                        "text-white/90 text-sm",
                        "focus:outline-none",
                        "placeholder:text-white/20",
                        "min-h-[60px]",
                      )}
                      style={{ overflow: "hidden" }}
                      showRing={false}
                    />
                  </div>

                  <AnimatePresence>
                    {attachments.length > 0 && (
                      <motion.div className="px-4 pb-3 flex gap-2 flex-wrap" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        {attachments.map((file, index) => (
                          <motion.div
                            key={`${file}-${index}`}
                            className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-white/70"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                          >
                            <span>{file}</span>
                            <button onClick={() => removeAttachment(index)} className="text-white/40 hover:text-white transition-colors">
                              <XIcon className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value as ModelChoice)}
                        className="h-9 rounded-md border border-white/10 bg-black/40 px-2 text-xs text-white/90 outline-none focus:ring-1 focus:ring-violet-400/50"
                        aria-label="Choose AI model"
                      >
                        <option value="venice">Venice</option>
                        <option value="codex">OpenClaw (Codex)</option>
                        <option value="opus">OpenClaw (Opus)</option>
                      </select>
                      <motion.button type="button" onClick={handleAttachFile} whileTap={{ scale: 0.94 }} className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group">
                        <Paperclip className="w-4 h-4" />
                        <span className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </motion.button>
                      <motion.button
                        type="button"
                        data-command-button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCommandPalette((prev) => !prev);
                        }}
                        whileTap={{ scale: 0.94 }}
                        className={cn("p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group", showCommandPalette && "bg-white/10 text-white/90")}
                      >
                        <Command className="w-4 h-4" />
                        <span className="absolute inset-0 bg-white/[0.05] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </motion.button>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isTyping || !value.trim()}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        "flex items-center gap-2",
                        value.trim() ? "bg-white text-[#0A0A0B] shadow-lg shadow-white/10" : "bg-white/[0.05] text-white/40",
                      )}
                    >
                      {isTyping ? <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" /> : <SendIcon className="w-4 h-4" />}
                      <span>Send</span>
                    </motion.button>
                  </div>
                </motion.div>

                {status ? <p className="text-xs text-center text-yellow-300">{status}</p> : null}

                {ignitionReady && chatId ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                    <p className="text-xs text-center text-emerald-100/90">
                      Ignition ready for this chat. Hand off to production OpenClaw (3 swarms, ≤12 agents MVP).
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <motion.button
                        type="button"
                        onClick={() => void handleHandoffToOpenClaw()}
                        disabled={handoffStarting}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
                          handoffStarting
                            ? "bg-white/10 text-white/50"
                            : "bg-emerald-500 text-white hover:bg-emerald-400",
                        )}
                      >
                        {handoffStarting ? "Sending…" : "Send to OpenClaw"}
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => router.push(`/chats?chatId=${encodeURIComponent(chatId)}`)}
                        whileTap={{ scale: 0.98 }}
                        className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                      >
                        Open Chats panel
                      </motion.button>
                      {existingOfficeSessionId ? (
                        <motion.button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/agents/office?sessionId=${encodeURIComponent(existingOfficeSessionId)}`,
                            )
                          }
                          whileTap={{ scale: 0.98 }}
                          className="rounded-lg border border-violet-400/30 bg-violet-500/20 px-3 py-2 text-xs text-violet-100"
                        >
                          Open existing office
                        </motion.button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {commandSuggestions.map((suggestion, index) => (
                    <motion.button
                      key={suggestion.prefix}
                      onClick={() => selectCommandSuggestion(index)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 transition-all relative group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      title={suggestion.description}
                    >
                      {suggestion.icon}
                      <span>{suggestion.label}</span>
                      <motion.div
                        className="absolute inset-0 border border-white/[0.05] rounded-lg"
                        initial={false}
                        animate={{ opacity: [0, 1], scale: [0.98, 1] }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </motion.button>
                  ))}
                </div>

                {/* ── Fast Ideas Folder (in chat view) ── */}
                <div className="flex flex-col items-center justify-center gap-3 pt-2">
                  <p className="text-xs text-white/40">Quick start — tap a card for an instant agent brief</p>
                  <div className="relative flex h-[220px] w-full flex-col items-center justify-center gap-2">
                    <Folder
                      color="#5227FF"
                      size={2}
                      className={cn("custom-folder transition-opacity", folderPaperBusy !== null && "opacity-65")}
                      items={folderPaperLabels}
                      onPaperClick={handleFolderProfileClick}
                    />
                    <AnimatePresence>
                      {folderPaperBusy !== null && (
                        <motion.div
                          className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                          aria-live="polite"
                        >
                          <LoaderIcon className="h-3.5 w-3.5 animate-[spin_1.5s_linear_infinite] text-violet-300" />
                          <span className="text-xs text-violet-300/90">
                            Venice is drafting your{" "}
                            {folderPaperBusy === 0 ? "conservative" : folderPaperBusy === 1 ? "balanced" : "ambitious"} brief…
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {(isTyping || folderPaperBusy !== null) && (
          <motion.div
            className="fixed bottom-8 left-1/2 mx-auto transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-center">
                <span className="text-xs font-medium text-white/90 mb-0.5">vn</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>{folderPaperBusy !== null ? "Venice generating brief" : typingLabel}</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
          animate={{ x: mousePosition.x - 400, y: mousePosition.y - 400 }}
          transition={{ type: "spring", damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}

      {recentCommand ? (
        <div className="fixed top-6 right-6 px-3 py-2 rounded-lg border border-white/10 bg-black/60 text-xs text-white/80">
          Selected: {recentCommand}
        </div>
      ) : null}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)" }}
        />
      ))}
    </div>
  );
}

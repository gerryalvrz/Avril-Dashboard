"use client";

import { useEffect, useRef, useCallback, useTransition } from "react";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Figma,
  MonitorIcon,
  Command,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import Folder from "@/components/ui/folder";

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
  role: "user" | "venice";
  content: string;
  createdAt: string;
};

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? "";

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
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [status, setStatus] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  /** Folder hidden until user opens it via Fast Ideas */
  const [showFolder, setShowFolder] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const commandSuggestions: CommandSuggestion[] = [
    { icon: <ImageIcon className="w-4 h-4" />, label: "Clone UI", description: "Generate a UI from a screenshot", prefix: "/clone" },
    { icon: <Figma className="w-4 h-4" />, label: "Import Figma", description: "Import a design from Figma", prefix: "/figma" },
    { icon: <MonitorIcon className="w-4 h-4" />, label: "Create Page", description: "Generate a new web page", prefix: "/page" },
    { icon: <Sparkles className="w-4 h-4" />, label: "Improve", description: "Improve existing UI design", prefix: "/improve" },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) => cmd.prefix.startsWith(value));
      setActiveSuggestion(matchingSuggestionIndex >= 0 ? matchingSuggestionIndex : -1);
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
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-token": DASHBOARD_TOKEN,
        },
        body: JSON.stringify({
          title: "Home Venice Chat",
          area: "General",
        }),
      });
      if (!res.ok) {
        setStatus("Could not initialize Venice chat session.");
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
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-token": DASHBOARD_TOKEN,
        },
        body: JSON.stringify({
          chatId: resolvedChatId,
          message: content,
          model: "venice",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Venice error: ${data?.error?.message || "request failed"}`);
        return;
      }

      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (!reply) {
        setStatus("Venice returned an empty response.");
        return;
      }

      setMessages((prev) => [...prev, { id: `${Date.now()}-venice`, role: "venice", content: reply, createdAt: new Date().toISOString() }]);
    } catch {
      setStatus("Network error contacting Venice.");
    } finally {
      setIsTyping(false);
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
    setValue(selectedCommand.prefix + " ");
    setShowCommandPalette(false);
    setRecentCommand(selectedCommand.label);
    setTimeout(() => setRecentCommand(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden lab-bg">
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
            <motion.p className="text-sm text-white/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              Model: Venice
            </motion.p>
          </div>

          <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 px-1">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-white/45">Start a Venice conversation by sending your first message.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[88%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "user" ? "ml-auto bg-white/10 text-white/90" : "mr-auto bg-violet-500/10 text-white/90 border border-violet-400/20",
                  )}
                >
                  <p className="text-[11px] text-white/45 mb-1">{message.role === "user" ? "You" : "Venice"}</p>
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
                        <div className="text-white/40 text-xs ml-1">{suggestion.prefix}</div>
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
                placeholder="Ask Venice a question..."
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

          <div className="pt-4 flex flex-col items-center justify-center gap-4">
            <motion.button
              type="button"
              onClick={() => setShowFolder((prev) => !prev)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-100 border border-violet-300/30 hover:bg-violet-500/30 transition-colors"
            >
              {showFolder ? "Hide folder" : "Fast Ideas"}
            </motion.button>
            {showFolder ? (
              <>
                <p className="text-xs text-white/45">Folder</p>
                <div className="h-[180px] w-full relative flex items-center justify-center">
                  <Folder color="#5227FF" size={2} className="custom-folder" />
                </div>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isTyping && (
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
                <span>Venice thinking</span>
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

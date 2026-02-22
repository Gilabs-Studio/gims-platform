"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAIChatStore } from "../stores/use-ai-chat-store";
import {
  useSendMessage,
  useAIChatSessionDetail,
} from "../hooks/use-ai-chat";
import { SessionList } from "./session-list";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ModelSelector } from "./model-selector";
import type { AIChatMessage, AIActionPreview } from "../types";

export function AIChatWidget() {
  const t = useTranslations("aiChat");
  const { isOpen, activeSessionId, selectedModel, toggleChat, closeChat, setActiveSession } =
    useAIChatStore();
  const [showSidebar, setShowSidebar] = useState(false);

  const { data: sessionDetail, isLoading: isLoadingSession } =
    useAIChatSessionDetail(activeSessionId);

  const sendMessage = useSendMessage();

  const messages: AIChatMessage[] = sessionDetail?.data?.messages ?? [];
  const pendingAction: AIActionPreview | null =
    sessionDetail?.data?.pending_action ?? null;

  const handleSend = useCallback(
    (content: string) => {
      sendMessage.mutate(
        {
          message: content,
          session_id: activeSessionId ?? undefined,
          model: selectedModel ?? undefined,
        },
        {
          onSuccess: (response) => {
            // Set the session ID if this is a new conversation
            if (!activeSessionId && response?.data?.session_id) {
              setActiveSession(response.data.session_id);
            }
          },
          onError: () => {
            toast.error(t("error.sendFailed"));
          },
        }
      );
    },
    [activeSessionId, selectedModel, sendMessage, setActiveSession, t]
  );

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-14 w-14 cursor-pointer rounded-full shadow-lg"
                  onClick={toggleChat}
                >
                  <MessageSquare className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{t("title")}</TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed bottom-6 right-6 z-40 flex overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
              showSidebar ? "h-[600px] w-[700px]" : "h-[600px] w-[420px]"
            )}
          >
            {/* Sidebar */}
            <AnimatePresence>
              {showSidebar && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full shrink-0 overflow-hidden"
                >
                  <SessionList />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main chat area */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 cursor-pointer"
                      onClick={() => setShowSidebar((prev) => !prev)}
                    >
                      {showSidebar ? (
                        <PanelLeftClose className="h-4 w-4" />
                      ) : (
                        <PanelLeftOpen className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("sessions")}</TooltipContent>
                </Tooltip>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {sessionDetail?.data?.title || t("title")}
                  </h2>
                  <ModelSelector />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 cursor-pointer"
                  onClick={closeChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <MessageList
                messages={messages}
                action={pendingAction}
                sessionId={activeSessionId ?? ""}
                isLoading={sendMessage.isPending || isLoadingSession}
              />

              {/* Input */}
              <MessageInput
                onSend={handleSend}
                isLoading={sendMessage.isPending}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAIChatStore } from "@/features/ai-chat/stores/use-ai-chat-store";
import {
  useSendMessage,
  useAIChatSessionDetail,
} from "@/features/ai-chat/hooks/use-ai-chat";
import { SessionList } from "@/features/ai-chat/components/session-list";
import { MessageList } from "@/features/ai-chat/components/message-list";
import { MessageInput } from "@/features/ai-chat/components/message-input";
import type {
  AIChatMessage,
  AIActionPreview,
} from "@/features/ai-chat/types";

export default function AIChatbotPage() {
  const t = useTranslations("aiChat");
  const {
    activeSessionId,
    selectedModel,
    setActiveSession,
    startNewChat,
    closeChat,
  } =
    useAIChatStore();
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    // Ensure floating widget is closed while using the dedicated chatbot page.
    closeChat();
  }, [closeChat]);

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
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "h-full shrink-0 transition-all duration-200",
          showSidebar ? "w-[280px]" : "w-0"
        )}
      >
        {showSidebar && <SessionList />}
      </div>

      {/* Main Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
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

          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {sessionDetail?.data?.title || t("title")}
              </h1>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>

          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
                  onClick={startNewChat}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("newChat")}</TooltipContent>
            </Tooltip>
          </div>
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
    </div>
  );
}

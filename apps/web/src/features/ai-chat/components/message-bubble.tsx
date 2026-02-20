"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

import { ActionCard } from "./action-card";
import type { AIChatMessage, AIActionPreview } from "../types";

interface MessageBubbleProps {
  message: AIChatMessage;
  action?: AIActionPreview | null;
  sessionId: string;
}

export function MessageBubble({ message, action, sessionId }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant avatar */}
      {isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted text-foreground"
          )}
        >
          {isAssistant ? (
            <div className="ai-chat-markdown prose prose-sm dark:prose-invert max-w-none wrap-break-word [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_pre]:my-1 [&_pre]:rounded-md [&_pre]:bg-background/50 [&_pre]:p-2 [&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:border-border/40 [&_thead]:bg-muted/50 [&_th]:border [&_th]:border-border/40 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground/80 [&_td]:border [&_td]:border-border/40 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-foreground/70 [&_tr:hover]:bg-muted/30 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
              <div className="overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
          )}
        </div>

        {/* Action card */}
        {action && (
          <ActionCard action={action} sessionId={sessionId} />
        )}

        {/* Token usage badge (for assistant messages) */}
        {isAssistant && message.duration_ms != null && message.duration_ms > 0 && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">
            {(message.duration_ms / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
          <User className="h-4 w-4 text-accent-foreground" />
        </div>
      )}
    </div>
  );
}

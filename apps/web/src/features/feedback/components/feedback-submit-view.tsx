"use client";

import * as React from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import {
  Bold,
  Italic,
  List,
  Code,
  Link as LinkIcon,
  Send,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import apiClient from "@/lib/api-client";

export function FeedbackSubmitView() {
  const t = useTranslations("userFeedback");
  const [message, setMessage] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (syntax: "bold" | "italic" | "list" | "code" | "link") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    switch (syntax) {
      case "bold":
        replacement = `**${selectedText || "bold_text"}**`;
        cursorOffset = selectedText ? 0 : 2;
        break;
      case "italic":
        replacement = `*${selectedText || "italic_text"}*`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case "list":
        replacement = `\n- ${selectedText || "list_item"}`;
        cursorOffset = 0;
        break;
      case "code":
        replacement = selectedText.includes("\n")
          ? `\n\`\`\`\n${selectedText}\n\`\`\`\n`
          : `\`${selectedText || "code"}\``;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case "link":
        replacement = `[${selectedText || "link_title"}](https://example.com)`;
        cursorOffset = selectedText ? 0 : 1;
        break;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setMessage(newValue);

    // Refocus and place cursor correctly
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length - cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message || message.trim().length < 5) {
      toast.error(t("toastMinLength"), {
        description: t("toastMinLengthDesc"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/feedback/support", {
        message: message.trim(),
        image_url: imageUrl || undefined,
      });

      setIsSuccess(true);
      toast.success(t("toastSuccessTitle"), {
        description: t("toastSuccessDesc"),
      });
      setMessage("");
      setImageUrl(null);
    } catch (error: unknown) {
      let errorMsg = t("toastErrorTitle");
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMsg = response.data.message;
        }
      }
      toast.error(t("toastErrorTitle"), {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto px-4 text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight mb-2">{t("successTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t("successDesc")}
        </p>
        <Button onClick={() => setIsSuccess(false)} variant="outline" className="cursor-pointer">
          {t("successAction")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header - Super Minimal */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor & Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-medium">{t("writeCardTitle")}</CardTitle>
              <CardDescription className="text-xs">
                {t("writeCardDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="write" className="w-full">
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <TabsList className="grid w-[160px] grid-cols-2">
                      <TabsTrigger value="write" className="text-xs cursor-pointer">{t("writeTab")}</TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs cursor-pointer">{t("previewTab")}</TabsTrigger>
                    </TabsList>

                    {/* Editor Toolbar - Minimalist */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => insertMarkdown("bold")}
                      >
                        <Bold className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => insertMarkdown("italic")}
                      >
                        <Italic className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => insertMarkdown("list")}
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => insertMarkdown("code")}
                      >
                        <Code className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => insertMarkdown("link")}
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="write" className="space-y-4 pt-1 outline-none">
                    <Textarea
                      ref={textareaRef}
                      placeholder={t("placeholder")}
                      className="min-h-[200px] font-sans text-sm resize-y focus-visible:ring-primary leading-relaxed"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="pt-1 outline-none">
                    <div className="min-h-[200px] max-h-[300px] overflow-y-auto border rounded-md p-4 bg-muted/10 prose prose-sm dark:prose-invert max-w-none">
                      {message.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">
                          {t("placeholder")}
                        </span>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Screenshot Uploader */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    {t("attachImage")}
                  </label>
                  <div className="w-full flex items-center justify-start">
                    <ImageUpload
                      value={imageUrl}
                      onChange={setImageUrl}
                      uploadFolder="support-feedback"
                      disabled={isSubmitting}
                      className="max-w-[160px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="gap-2 cursor-pointer transition-all duration-200"
                    size="sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting ? t("submittingBtn") : t("submitBtn")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Support Sidebar / Tips */}
        <div className="space-y-6">
          <Card className="border border-border/40 shadow-sm bg-muted/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sidebarTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div>
                <strong className="text-foreground block mb-0.5">{t("sidebarTip1Title")}</strong>
                {t("sidebarTip1Desc")}
              </div>
              <div>
                <strong className="text-foreground block mb-0.5">{t("sidebarTip2Title")}</strong>
                {t("sidebarTip2Desc")}
              </div>
              <div>
                <strong className="text-foreground block mb-0.5">{t("sidebarTip3Title")}</strong>
                {t("sidebarTip3Desc")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

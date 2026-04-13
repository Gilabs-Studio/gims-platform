"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Code2, Eye, FileQuestion, Pencil, Plus, Save, Settings2, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useOutlets } from "@/features/master-data/outlet/hooks/use-outlets";

import {
  useCreateFeedbackForm,
  useDeleteFeedbackForm,
  useFeedbackForms,
  useUpdateFeedbackForm,
} from "../hooks/use-feedback";
import type {
  CreateFeedbackFormRequest,
  FeedbackForm,
  FormQuestion,
  FormSchema,
  MultipleChoiceConfig,
  QuestionType,
  RatingConfig,
  TextConfig,
  UpdateFeedbackFormRequest,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_QUESTION = (): FormQuestion => ({
  id: crypto.randomUUID(),
  type: "rating",
  label: "",
  required: true,
  order: 0,
  config: { min: 1, max: 5 } satisfies RatingConfig,
});

const EMPTY_SCHEMA: FormSchema = { questions: [EMPTY_QUESTION()] };

function schemaToJson(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2);
}

function jsonToSchema(json: string): { schema: FormSchema; error: string | null } {
  try {
    const parsed = JSON.parse(json) as FormSchema;
    if (!Array.isArray(parsed.questions)) {
      return { schema: EMPTY_SCHEMA, error: 'JSON must have a "questions" array' };
    }
    return { schema: parsed, error: null };
  } catch (e) {
    return { schema: EMPTY_SCHEMA, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

// ─── QuestionEditor sub-component ─────────────────────────────────────────────

interface QuestionEditorProps {
  question: FormQuestion;
  index: number;
  onUpdate: (patch: Partial<FormQuestion>) => void;
  onChangeType: (type: QuestionType) => void;
  onRemove: () => void;
  showRemove: boolean;
}

function QuestionEditor({ question, index, onUpdate, onChangeType, onRemove, showRemove }: QuestionEditorProps) {
  const t = useTranslations("feedback.forms");
  const ratingCfg = question.config as RatingConfig | undefined;
  const choiceCfg = question.config as MultipleChoiceConfig | undefined;
  const textCfg = question.config as TextConfig | undefined;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {index + 1}
        </span>
        <select
          className="border rounded-md px-2 py-1 text-sm bg-background cursor-pointer"
          value={question.type}
          onChange={(e) => onChangeType(e.target.value as QuestionType)}
        >
          <option value="rating">{t("form.types.rating")}</option>
          <option value="multiple_choice">{t("form.types.multiple_choice")}</option>
          <option value="text">{t("form.types.text")}</option>
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <Switch
            id={`q-req-${question.id}`}
            checked={question.required}
            onCheckedChange={(v) => onUpdate({ required: v })}
          />
          <Label htmlFor={`q-req-${question.id}`} className="text-xs cursor-pointer">
            {t("form.questionRequired")}
          </Label>
          {showRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="ml-1 h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Label */}
      <Input
        placeholder={t("form.questionLabelPlaceholder")}
        value={question.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
      />

      {/* Type-specific config */}
      {question.type === "rating" && (
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">{t("form.ratingMin")}</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={ratingCfg?.min ?? 1}
              onChange={(e) =>
                onUpdate({ config: { ...ratingCfg, min: Number(e.target.value) } as RatingConfig })
              }
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs">{t("form.ratingMax")}</Label>
            <Input
              type="number"
              min={2}
              max={10}
              value={ratingCfg?.max ?? 5}
              onChange={(e) =>
                onUpdate({ config: { ...ratingCfg, max: Number(e.target.value) } as RatingConfig })
              }
            />
          </div>
        </div>
      )}

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id={`q-multi-${question.id}`}
              checked={choiceCfg?.allow_multiple ?? false}
              onCheckedChange={(v) =>
                onUpdate({ config: { ...(choiceCfg ?? {}), allow_multiple: v } as MultipleChoiceConfig })
              }
            />
            <Label htmlFor={`q-multi-${question.id}`} className="text-xs cursor-pointer">
              Allow multiple
            </Label>
          </div>
          {(choiceCfg?.options ?? []).map((opt, oi) => (
            <div key={oi} className="flex gap-2">
              <Input
                placeholder={t("form.choicePlaceholder")}
                value={opt}
                onChange={(e) => {
                  const options = [...(choiceCfg?.options ?? [])];
                  options[oi] = e.target.value;
                  onUpdate({ config: { ...(choiceCfg ?? {}), options } as MultipleChoiceConfig });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={() => {
                  const options = (choiceCfg?.options ?? []).filter((_, i) => i !== oi);
                  onUpdate({ config: { ...(choiceCfg ?? {}), options } as MultipleChoiceConfig });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              const options = [...(choiceCfg?.options ?? []), ""];
              onUpdate({ config: { ...(choiceCfg ?? {}), options } as MultipleChoiceConfig });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t("form.addChoice")}
          </Button>
        </div>
      )}

      {question.type === "text" && (
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">{t("form.textMaxLength")}</Label>
            <Input
              type="number"
              min={1}
              max={5000}
              value={textCfg?.max_length ?? 500}
              onChange={(e) =>
                onUpdate({ config: { ...textCfg, max_length: Number(e.target.value) } as TextConfig })
              }
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs">{t("form.textPlaceholder")}</Label>
            <Input
              placeholder="e.g. Enter your feedback..."
              value={textCfg?.placeholder ?? ""}
              onChange={(e) =>
                onUpdate({ config: { ...textCfg, placeholder: e.target.value } as TextConfig })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FormEditorPanel ──────────────────────────────────────────────────────────

interface FormEditorPanelProps {
  editingItem: FeedbackForm | null;
  onSaved: () => void;
  onCancel: () => void;
}

function FormEditorPanel({ editingItem, onSaved, onCancel }: FormEditorPanelProps) {
  const t = useTranslations("feedback.forms");
  const tCommon = useTranslations("common");

  const [formOutletId, setFormOutletId] = useState(editingItem?.outlet_id ?? "");
  const [formTitle, setFormTitle] = useState(editingItem?.title ?? "");
  const [formDescription, setFormDescription] = useState(editingItem?.description ?? "");
  const [formIsActive, setFormIsActive] = useState(editingItem?.is_active ?? false);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>(
    editingItem?.schema_json?.questions?.length
      ? editingItem.schema_json.questions
      : [EMPTY_QUESTION()]
  );
  const [jsonText, setJsonText] = useState(() =>
    schemaToJson({
      questions:
        editingItem?.schema_json?.questions?.length
          ? editingItem.schema_json.questions
          : [EMPTY_QUESTION()],
    })
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  const { data: outletsData } = useOutlets({ per_page: 100 });
  const outlets = outletsData?.data ?? [];

  const createMutation = useCreateFeedbackForm();
  const updateMutation = useUpdateFeedbackForm();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Sync visual → json when visual changes
  useEffect(() => {
    if (activeTab === "visual") {
      setJsonText(schemaToJson({ questions: formQuestions }));
    }
  }, [formQuestions, activeTab]);

  // Sync json → visual when switching to visual tab
  function handleTabChange(tab: string) {
    if (tab === "visual" && activeTab === "json") {
      const { schema, error } = jsonToSchema(jsonText);
      if (error) {
        setJsonError(error);
        return; // block switch until JSON is valid
      }
      setFormQuestions(schema.questions);
      setJsonError(null);
    }
    setActiveTab(tab as "visual" | "json");
  }

  const addQuestion = useCallback(() => {
    setFormQuestions((prev) => [...prev, { ...EMPTY_QUESTION(), order: prev.length + 1 }]);
  }, []);

  const removeQuestion = useCallback((idx: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateQuestion = useCallback((idx: number, patch: Partial<FormQuestion>) => {
    setFormQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }, []);

  const changeQuestionType = useCallback((idx: number, type: QuestionType) => {
    let config: RatingConfig | MultipleChoiceConfig | TextConfig;
    if (type === "rating") config = { min: 1, max: 5 };
    else if (type === "multiple_choice") config = { options: ["Option 1", "Option 2"], allow_multiple: false };
    else config = { max_length: 500, placeholder: "" };
    setFormQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, type, config } : q)));
  }, []);

  async function handleSave() {
    // Resolve final schema from active tab
    let finalQuestions = formQuestions;
    if (activeTab === "json") {
      const { schema, error } = jsonToSchema(jsonText);
      if (error) {
        setJsonError(error);
        return;
      }
      finalQuestions = schema.questions;
    }

    const orderedQuestions = finalQuestions.map((q, i) => ({ ...q, order: i + 1 }));

    if (editingItem) {
      const payload: UpdateFeedbackFormRequest = {
        title: formTitle,
        description: formDescription || undefined,
        schema_json: { questions: orderedQuestions },
        is_active: formIsActive,
      };
      try {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(t("updated"));
        onSaved();
      } catch {
        toast.error(tCommon("error"));
      }
    } else {
      const payload: CreateFeedbackFormRequest = {
        outlet_id: formOutletId,
        title: formTitle,
        description: formDescription || undefined,
        schema_json: { questions: orderedQuestions },
        is_active: formIsActive,
      };
      try {
        await createMutation.mutateAsync(payload);
        toast.success(t("created"));
        onSaved();
      } catch {
        toast.error(tCommon("error"));
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">
            {editingItem ? t("edit") : t("create")}
          </h3>
          {editingItem && (
            <Badge variant={editingItem.is_active ? "default" : "secondary"} className="ml-1">
              v{editingItem.version}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="cursor-pointer">
            {tCommon("cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="cursor-pointer">
            <Save className="mr-2 h-3 w-3" />
            {isSaving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Meta fields */}
        <div className="space-y-4">
          {/* Outlet — only for new forms */}
          {!editingItem && (
            <div className="space-y-1.5">
              <Label htmlFor="fb-outlet">{t("form.outlet")}</Label>
              <select
                id="fb-outlet"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background cursor-pointer"
                value={formOutletId}
                onChange={(e) => setFormOutletId(e.target.value)}
              >
                <option value="">{t("form.outletPlaceholder")}</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fb-title">{t("form.title")}</Label>
            <Input
              id="fb-title"
              placeholder={t("form.titlePlaceholder")}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-desc">{t("form.description")}</Label>
            <Textarea
              id="fb-desc"
              placeholder={t("form.descriptionPlaceholder")}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="fb-active"
              checked={formIsActive}
              onCheckedChange={setFormIsActive}
            />
            <div>
              <Label htmlFor="fb-active" className="cursor-pointer">{t("form.isActive")}</Label>
              <p className="text-xs text-muted-foreground">{t("form.isActiveHint")}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Question Editor — Visual / JSON tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">{t("form.schema")}</p>
            <TabsList className="h-8">
              <TabsTrigger value="visual" className="text-xs px-3 cursor-pointer">
                <Eye className="mr-1 h-3 w-3" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs px-3 cursor-pointer">
                <Code2 className="mr-1 h-3 w-3" />
                JSON
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visual" className="space-y-3 mt-0">
            {formQuestions.map((q, idx) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={idx}
                onUpdate={(patch) => updateQuestion(idx, patch)}
                onChangeType={(type) => changeQuestionType(idx, type)}
                onRemove={() => removeQuestion(idx)}
                showRemove={formQuestions.length > 1}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("form.addQuestion")}
            </Button>
          </TabsContent>

          <TabsContent value="json" className="mt-0">
            {jsonError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-3">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
            <Textarea
              className="font-mono text-xs min-h-[400px] resize-y"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
              }}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Edit the schema JSON directly. Switch to Visual tab to validate and apply.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FeedbackFormBuilder() {
  const t = useTranslations("feedback.forms");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("feedback.create");
  const canDelete = useUserPermission("feedback.delete");

  const [page] = useState(1);
  const [selectedItem, setSelectedItem] = useState<FeedbackForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FeedbackForm | null>(null);

  const { data, isLoading, isError, refetch } = useFeedbackForms({
    page,
    per_page: 50,
  });

  const deleteMutation = useDeleteFeedbackForm();
  const items = data?.data ?? [];

  function startCreate() {
    setSelectedItem(null);
    setIsCreating(true);
  }

  function closeEditor() {
    setIsCreating(false);
    setSelectedItem(null);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      await deleteMutation.mutateAsync(deleteItem.id);
      toast.success(t("deleted"));
      if (selectedItem?.id === deleteItem.id) closeEditor();
      setDeleteItem(null);
    } catch {
      toast.error(tCommon("error"));
    }
  }

  const showEditor = isCreating || selectedItem !== null;
  const editorKey = isCreating ? "new" : selectedItem?.id ?? "";

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border bg-background">
      {/* ── Left panel: form list ── */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r">
        {/* List header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{t("title")}</span>
          </div>
          {canCreate && (
            <Button size="icon" variant="ghost" onClick={startCreate} className="h-7 w-7 cursor-pointer">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Form list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-center">
              <p className="text-sm text-destructive mb-2">{tCommon("noData")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
                {tCommon("retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 px-4 text-center text-muted-foreground">
              <FileQuestion className="h-8 w-8 opacity-40" />
              <p className="text-sm">{t("empty")}</p>
              {canCreate && (
                <Button variant="outline" size="sm" onClick={startCreate} className="mt-1 cursor-pointer">
                  <Plus className="mr-1 h-3 w-3" />
                  {t("create")}
                </Button>
              )}
            </div>
          ) : (
            items.map((item: FeedbackForm) => {
              const isActive = item.id === selectedItem?.id;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedItem(item);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsCreating(false);
                      setSelectedItem(item);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 cursor-pointer ${
                    isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.schema_json?.questions?.length ?? 0} questions · v{item.version}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge
                        variant={item.is_active ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.is_active ? t("active") : t("inactive")}
                      </Badge>
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}
                          className="p-0.5 rounded hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Right panel: editor ── */}
      <main className="flex-1 min-w-0">
        {showEditor ? (
          <FormEditorPanel
            key={editorKey}
            editingItem={selectedItem}
            onSaved={() => { refetch(); closeEditor(); }}
            onCancel={closeEditor}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Pencil className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("selectOrCreate")}</p>
            {canCreate && (
              <Button variant="outline" onClick={startCreate} className="mt-1 cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                {t("create")}
              </Button>
            )}
          </div>
        )}
      </main>

      <DeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteConfirm")}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

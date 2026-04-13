"use client";

import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useSubmitFeedback } from "@/features/pos/feedback/hooks/use-feedback";
import type {
  AnswerValue,
  FormQuestion,
  FormSchema,
  MultipleChoiceConfig,
  RatingConfig,
  TextConfig,
} from "@/features/pos/feedback/types";

interface PublicFeedbackFormProps {
  token: string;
  title: string;
  description?: string;
  greeting?: string;
  schema: FormSchema;
  customerName?: string;
}

export function PublicFeedbackForm({
  token,
  title,
  description,
  greeting,
  schema,
  customerName,
}: PublicFeedbackFormProps) {
  const submitMutation = useSubmitFeedback(token);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitted, setSubmitted] = useState(false);

  const questions = schema.questions ?? [];

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleChoice(questionId: string, option: string, allowMultiple: boolean) {
    const current = (answers[questionId] as string[]) ?? [];
    if (allowMultiple) {
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      setAnswer(questionId, next);
    } else {
      setAnswer(questionId, [option]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const unanswered = questions.filter(
      (q) =>
        q.required &&
        (answers[q.id] === undefined ||
          answers[q.id] === "" ||
          (Array.isArray(answers[q.id]) &&
            (answers[q.id] as string[]).length === 0))
    );

    if (unanswered.length > 0) {
      toast.error("Please answer all required questions.");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        answers,
        customer_name: customerName,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to submit feedback.";
      toast.error(errorMessage);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Thank you for your feedback!</h2>
        <p className="text-muted-foreground text-sm">
          Your response has been recorded. We appreciate your time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {customerName && (
          <p className="mt-1 text-sm text-muted-foreground">
            {greeting ?? customerName}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions
          .sort((a, b) => a.order - b.order)
          .map((q) => (
            <QuestionInput
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(val) => setAnswer(q.id, val)}
              onToggleChoice={(option, allowMultiple) =>
                toggleChoice(q.id, option, allowMultiple)
              }
            />
          ))}

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
        </Button>
      </form>
    </div>
  );
}

// ── Per-question input renderer ───────────────────────────────────────────────

interface QuestionInputProps {
  question: FormQuestion;
  value: AnswerValue | undefined;
  onChange: (val: AnswerValue) => void;
  onToggleChoice: (option: string, allowMultiple: boolean) => void;
}

function QuestionInput({
  question,
  value,
  onChange,
  onToggleChoice,
}: QuestionInputProps) {
  const ratingConfig = question.config as RatingConfig | undefined;
  const choiceConfig = question.config as MultipleChoiceConfig | undefined;
  const textConfig = question.config as TextConfig | undefined;

  return (
    <div className="space-y-2">
      <Label className="text-base font-medium leading-snug">
        {question.label}
        {question.required && (
          <span className="ml-1 text-destructive">*</span>
        )}
      </Label>

      {question.type === "rating" && (
        <RatingInput
          min={ratingConfig?.min ?? 1}
          max={ratingConfig?.max ?? 5}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      )}

      {question.type === "multiple_choice" && (
        <ChoiceInput
          options={choiceConfig?.options ?? []}
          allowMultiple={choiceConfig?.allow_multiple ?? false}
          selected={(value as string[]) ?? []}
          onToggle={onToggleChoice}
        />
      )}

      {question.type === "text" && (
        <Textarea
          placeholder={
            (textConfig?.placeholder as string | undefined) ?? "Your answer..."
          }
          maxLength={textConfig?.max_length ?? 1000}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      )}
    </div>
  );
}

function RatingInput({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const isStarRating = min === 1 && max <= 5;

  if (isStarRating) {
    return (
      <div className="flex gap-1">
        {range.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="cursor-pointer p-1 rounded focus:outline-none focus-visible:ring-2"
            aria-label={`Rate ${n} out of ${max}`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                value !== undefined && n <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
        {value !== undefined && (
          <span className="self-center ml-2 text-sm text-muted-foreground">
            {value}/{max}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {range.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`cursor-pointer h-10 w-10 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${
            value === n
              ? "bg-primary text-primary-foreground border-primary"
              : "border-input hover:bg-accent"
          }`}
          aria-label={`Rate ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ChoiceInput({
  options,
  allowMultiple,
  selected,
  onToggle,
}: {
  options: string[];
  allowMultiple: boolean;
  selected: string[];
  onToggle: (option: string, allowMultiple: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt, allowMultiple)}
            className={`cursor-pointer w-full text-left rounded-md border px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 ${
              isSelected
                ? "bg-primary/10 border-primary text-primary font-medium"
                : "border-input hover:bg-accent"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

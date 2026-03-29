export interface VisitInterestAnswerRef {
  question_id: string;
  option_id: string;
}

export interface VisitSurveyAnswerSummary {
  question_text: string;
  option_text: string;
  score: number;
}

interface VisitInterestQuestionDefinition {
  id: string;
  question_text_key: string;
  sequence: number;
  options: {
    id: string;
    option_text_key: string;
    score: number;
  }[];
}

export const VISIT_INTEREST_QUESTIONS: VisitInterestQuestionDefinition[] = [
  {
    id: "need",
    question_text_key: "surveyQuestions.need",
    sequence: 1,
    options: [
      { id: "yes", option_text_key: "surveyAnswers.yes", score: 1 },
      { id: "no", option_text_key: "surveyAnswers.no", score: 0 },
    ],
  },
  {
    id: "budget",
    question_text_key: "surveyQuestions.budget",
    sequence: 2,
    options: [
      { id: "yes", option_text_key: "surveyAnswers.yes", score: 1 },
      { id: "no", option_text_key: "surveyAnswers.no", score: 0 },
    ],
  },
  {
    id: "decision-maker",
    question_text_key: "surveyQuestions.decisionMaker",
    sequence: 3,
    options: [
      { id: "yes", option_text_key: "surveyAnswers.yes", score: 1 },
      { id: "no", option_text_key: "surveyAnswers.no", score: 0 },
    ],
  },
  {
    id: "timeline",
    question_text_key: "surveyQuestions.timeline",
    sequence: 4,
    options: [
      { id: "yes", option_text_key: "surveyAnswers.yes", score: 1 },
      { id: "no", option_text_key: "surveyAnswers.no", score: 0 },
    ],
  },
  {
    id: "fit",
    question_text_key: "surveyQuestions.fit",
    sequence: 5,
    options: [
      { id: "yes", option_text_key: "surveyAnswers.yes", score: 1 },
      { id: "no", option_text_key: "surveyAnswers.no", score: 0 },
    ],
  },
];

const QUESTION_MAP = new Map(VISIT_INTEREST_QUESTIONS.map((q) => [q.id, q]));

export function calculateVisitInterestLevel(answers: VisitInterestAnswerRef[]): number {
  if (!answers.length) {
    return 0;
  }

  let score = 0;
  for (const ans of answers) {
    const question = QUESTION_MAP.get(ans.question_id);
    const option = question?.options.find((opt) => opt.id === ans.option_id);
    score += option?.score ?? 0;
  }

  return Math.min(score, 5);
}

export function resolveVisitSurveyAnswers(
  raw: string | null | undefined,
  t: (key: string) => string,
): VisitSurveyAnswerSummary[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VisitInterestAnswerRef[];
    return parsed.flatMap((ans) => {
      const question = QUESTION_MAP.get(ans.question_id);
      const option = question?.options.find((opt) => opt.id === ans.option_id);
      if (!question || !option) {
        return [];
      }

      return [
        {
          question_text: t(question.question_text_key),
          option_text: t(option.option_text_key),
          score: option.score,
        },
      ];
    });
  } catch {
    return [];
  }
}

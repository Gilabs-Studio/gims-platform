export interface VisitInterestAnswerRef {
  question_id: string;
  option_id: string;
  question_text?: string;
  option_text?: string;
  score?: number;
}

export interface VisitSurveyAnswerSummary {
  question_text: string;
  option_text: string;
  score: number;
}

interface VisitInterestQuestionDefinition {
  id: string;
  question_text: string;
  sequence: number;
  options: {
    id: string;
    option_text: string;
    score: number;
  }[];
}

function buildQuestionMap(questions: VisitInterestQuestionDefinition[]): Map<string, VisitInterestQuestionDefinition> {
  return new Map(questions.map((q) => [q.id, q]));
}

export function calculateVisitInterestLevel(
  answers: VisitInterestAnswerRef[],
  questions: VisitInterestQuestionDefinition[],
): number {
  if (!answers.length) {
    return 0;
  }

  const questionMap = buildQuestionMap(questions);
  let score = 0;
  for (const ans of answers) {
    const question = questionMap.get(ans.question_id);
    const option = question?.options.find((opt) => opt.id === ans.option_id);
    score += option?.score ?? ans.score ?? 0;
  }

  return Math.min(score, 5);
}

export function resolveVisitSurveyAnswers(
  raw: string | null | undefined,
  questions: VisitInterestQuestionDefinition[],
): VisitSurveyAnswerSummary[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VisitInterestAnswerRef[];
    const questionMap = buildQuestionMap(questions);

    return parsed.flatMap((ans) => {
      if (ans.question_text && ans.option_text) {
        return [
          {
            question_text: ans.question_text,
            option_text: ans.option_text,
            score: ans.score ?? 0,
          },
        ];
      }

      const question = questionMap.get(ans.question_id);
      const option = question?.options.find((opt) => opt.id === ans.option_id);
      if (!question || !option) {
        return [];
      }

      return [
        {
          question_text: question.question_text,
          option_text: option.option_text,
          score: option.score,
        },
      ];
    });
  } catch {
    return [];
  }
}

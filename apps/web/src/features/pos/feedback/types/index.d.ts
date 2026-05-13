export type QuestionType = "rating" | "multiple_choice" | "text";

export interface RatingConfig {
  min: number;
  max: number;
  step?: number;
}

export interface MultipleChoiceConfig {
  options: string[];
  allow_multiple?: boolean;
}

export interface TextConfig {
  max_length?: number;
  placeholder?: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  order: number;
  config?: RatingConfig | MultipleChoiceConfig | TextConfig;
}

export interface FormSchema {
  questions: FormQuestion[];
}

export interface FeedbackForm {
  id: string;
  outlet_id: string;
  title: string;
  description?: string;
  schema_json: FormSchema;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackFormRequest {
  outlet_id: string;
  title: string;
  description?: string;
  schema_json: FormSchema;
  is_active?: boolean;
}

export interface UpdateFeedbackFormRequest {
  title?: string;
  description?: string;
  schema_json?: FormSchema;
  is_active?: boolean;
}

export interface PublicFormResponse {
  token: string;
  outlet_name?: string;
  title?: string;
  description?: string;
  schema_json?: FormSchema;
  customer_name?: string;
  pos_order_id?: string;
  status: "pending" | "used" | "expired";
  // Legacy response format compatibility
  form?: FeedbackForm;
}

export type AnswerValue = number | string | string[];

export interface SubmitFeedbackRequest {
  answers: Record<string, AnswerValue>;
  customer_name?: string;
}

export interface FeedbackResponseItem {
  id: string;
  form_id: string;
  outlet_id: string;
  outlet_name?: string;
  sales_order_id?: string;
  pos_order_id?: string;
  customer_name?: string;
  answers: Record<string, AnswerValue>;
  avg_score?: number;
  submitted_at: string;
}

export interface CopyFeedbackFormRequest {
  outlet_ids?: string[];
  apply_to_all_outlets?: boolean;
  is_active?: boolean;
  title?: string;
}

export interface CopyFeedbackFormResponse {
  copied_count: number;
  forms: FeedbackForm[];
}

export interface FeedbackListParams {
  page?: number;
  per_page?: number;
  outlet_id?: string;
  form_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface FeedbackFormListParams {
  page?: number;
  per_page?: number;
  outlet_id?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
  error?: string;
  message?: string;
}

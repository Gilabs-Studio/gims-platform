import { apiClient } from "@/lib/api-client";
import type {
  SendMessagePayload,
  SendMessageResponse,
  ConfirmActionPayload,
  SessionsListResponse,
  SessionDetailResponse,
  SessionFilters,
  ActionLogsResponse,
  ActionLogFilters,
  IntentRegistryResponse,
  AIModelsResponse,
} from "../types";

const BASE_PATH = "/ai";

export const aiChatService = {
  /** Get available AI models */
  async getModels(): Promise<AIModelsResponse> {
    const response = await apiClient.get<AIModelsResponse>(
      `${BASE_PATH}/models`
    );
    return response.data;
  },

  /** Send a message to the AI assistant */
  async sendMessage(
    payload: SendMessagePayload
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `${BASE_PATH}/chat/send`,
      payload
    );
    return response.data;
  },

  /** Confirm or cancel a pending action */
  async confirmAction(
    payload: ConfirmActionPayload
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `${BASE_PATH}/chat/confirm`,
      payload
    );
    return response.data;
  },

  /** List chat sessions for the current user */
  async getSessions(
    filters?: SessionFilters
  ): Promise<SessionsListResponse> {
    const response = await apiClient.get<SessionsListResponse>(
      `${BASE_PATH}/sessions`,
      { params: filters }
    );
    return response.data;
  },

  /** Get a session with full message history */
  async getSessionDetail(id: string): Promise<SessionDetailResponse> {
    const response = await apiClient.get<SessionDetailResponse>(
      `${BASE_PATH}/sessions/${id}`
    );
    return response.data;
  },

  /** Delete a chat session */
  async deleteSession(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/sessions/${id}`);
  },

  /** List all action logs (admin) */
  async getActionLogs(
    filters?: ActionLogFilters
  ): Promise<ActionLogsResponse> {
    const response = await apiClient.get<ActionLogsResponse>(
      `${BASE_PATH}/admin/actions`,
      { params: filters }
    );
    return response.data;
  },

  /** Get intent registry (admin) */
  async getIntentRegistry(): Promise<IntentRegistryResponse> {
    const response = await apiClient.get<IntentRegistryResponse>(
      `${BASE_PATH}/admin/intents`
    );
    return response.data;
  },
};

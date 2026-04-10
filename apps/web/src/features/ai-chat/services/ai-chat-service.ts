import { apiClient } from "@/lib/api-client";
import { getCSRFToken } from "@/lib/api-client";
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
  StreamEvent,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8087";
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

  /**
   * Send a message via the SSE streaming endpoint (v2).
   * Uses native fetch with ReadableStream for real-time event consumption.
   * Returns an AbortController so the caller can cancel the stream.
   */
  sendMessageStream(
    payload: SendMessagePayload,
    onEvent: (event: StreamEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ): AbortController {
    const controller = new AbortController();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    fetch(`${API_BASE_URL}/api/v1${BASE_PATH}/chat/v2/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "Stream request failed");
          throw new Error(text);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("ReadableStream not supported");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (possibly incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as StreamEvent;
              onEvent(event);
            } catch {
              // Skip malformed lines
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.startsWith("data:")) {
          const jsonStr = buffer.slice(5).trim();
          if (jsonStr) {
            try {
              const event = JSON.parse(jsonStr) as StreamEvent;
              onEvent(event);
            } catch {
              // Skip malformed
            }
          }
        }

        onComplete();
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        onError(err instanceof Error ? err : new Error(String(err)));
      });

    return controller;
  },

  /** Send message via v2 non-streaming engine endpoint */
  async sendMessageV2(
    payload: SendMessagePayload
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `${BASE_PATH}/chat/v2/send`,
      payload
    );
    return response.data;
  },

  /** Confirm action via v2 engine endpoint */
  async confirmActionV2(
    payload: ConfirmActionPayload
  ): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
      `${BASE_PATH}/chat/v2/confirm`,
      payload
    );
    return response.data;
  },
};

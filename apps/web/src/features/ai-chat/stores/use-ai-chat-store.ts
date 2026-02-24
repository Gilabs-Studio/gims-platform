"use client";

import { create } from "zustand";

interface AIChatStore {
  isOpen: boolean;
  activeSessionId: string | null;
  selectedModel: string | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setActiveSession: (sessionId: string | null) => void;
  setSelectedModel: (model: string) => void;
  startNewChat: () => void;
}

export const useAIChatStore = create<AIChatStore>((set) => ({
  isOpen: false,
  activeSessionId: null,
  selectedModel: null,
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  startNewChat: () => set({ activeSessionId: null }),
}));

export type ToolSideEffectLevel = "SAFE_READ" | "SAFE_WRITE" | "SIDE_EFFECT";

export type VoiceToolAction = {
  toolName: string;
  payload?: Record<string, unknown>;
  sideEffectLevel: ToolSideEffectLevel;
};

export type VoiceAgentResult = {
  sayText: string;
  actions: VoiceToolAction[];
};

export type VoiceSessionSummary = {
  sessionId: string;
  channel: string;
  createdAt: string;
  summary: string;
};

export type VoiceSessionRuntime = {
  voiceSessionId: string;
  shortTermContext: string[];
};

export type VoiceConfig = {
  openai: {
    apiKey: string;
    model: string;
    voice: string;
    temperature: number;
  };
  audio: {
    inputFormat: "pcm16";
    outputFormat: "pcm16";
    sampleRate: number;
  };
  vad: {
    type: "server_vad";
    threshold: number;
    prefixPaddingMs: number;
    silenceDurationMs: number;
  };
  session: {
    idleTimeoutSeconds: number;
    bootstrapSummaryLookbackMinutes: number;
    maxSayDurationSeconds: number;
  };
  safety: {
    requireConfirmationForSideEffect: boolean;
    confirmationKeywords: string[];
    cancelKeywords: string[];
  };
};

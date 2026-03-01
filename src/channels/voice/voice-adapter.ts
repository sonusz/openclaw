import type { VoiceAgentResult, VoiceToolAction } from "./types.js";

export type VoiceAgentRunner = (input: {
  userText: string;
  bootstrapContext: string[];
  voiceSessionId: string;
}) => Promise<VoiceAgentResult>;

export type VoiceAdapterResult = VoiceAgentResult & {
  requiresConfirmation: boolean;
};

export class VoiceAdapter {
  constructor(private readonly runner: VoiceAgentRunner) {}

  async runAgent(params: {
    userText: string;
    bootstrapContext: string[];
    voiceSessionId: string;
  }): Promise<VoiceAdapterResult> {
    const result = await this.runner(params);
    return {
      ...result,
      requiresConfirmation: result.actions.some(
        (action) => action.sideEffectLevel === "SIDE_EFFECT",
      ),
    };
  }

  filterSafeActions(actions: VoiceToolAction[]): VoiceToolAction[] {
    return actions.filter((action) => action.sideEffectLevel !== "SIDE_EFFECT");
  }
}

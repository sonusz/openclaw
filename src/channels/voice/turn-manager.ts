import { ConfirmationHandler } from "./confirmation.js";
import type { RealtimeIo } from "./realtime-io.js";
import type { VoiceToolAction } from "./types.js";
import type { VoiceAdapter } from "./voice-adapter.js";

export type TurnManagerDeps = {
  realtime: RealtimeIo;
  adapter: VoiceAdapter;
  confirmation: ConfirmationHandler;
  bootstrapContext: string[];
  voiceSessionId: string;
  executeActions: (actions: VoiceToolAction[]) => Promise<void>;
};

export class VoiceTurnManager {
  private isSpeaking = false;
  private awaitingConfirmation = false;
  private pendingActions: VoiceToolAction[] = [];
  private readonly shortTermContext: string[] = [];

  constructor(private readonly deps: TurnManagerDeps) {}

  async onSpeechStarted(): Promise<void> {
    this.isSpeaking = false;
    await this.deps.realtime.stopPlayback();
    await this.deps.realtime.cancelResponse();
  }

  async onFinalTranscript(text: string): Promise<void> {
    this.shortTermContext.push(`user:${text}`);
    if (this.awaitingConfirmation) {
      await this.routeConfirmation(text);
      return;
    }

    const result = await this.deps.adapter.runAgent({
      userText: text,
      bootstrapContext: this.deps.bootstrapContext,
      voiceSessionId: this.deps.voiceSessionId,
    });

    this.isSpeaking = true;
    await this.deps.realtime.speak(result.sayText);
    this.shortTermContext.push(`assistant:${result.sayText}`);

    if (result.requiresConfirmation) {
      this.awaitingConfirmation = true;
      this.pendingActions = result.actions;
      return;
    }

    await this.deps.executeActions(this.deps.adapter.filterSafeActions(result.actions));
  }

  getShortTermContext(): string[] {
    return [...this.shortTermContext];
  }

  private async routeConfirmation(text: string): Promise<void> {
    if (this.deps.confirmation.isCancel(text)) {
      this.awaitingConfirmation = false;
      this.pendingActions = [];
      await this.deps.realtime.speak("已取消，不执行任何操作。");
      return;
    }

    if (!this.deps.confirmation.isConfirm(text)) {
      await this.deps.realtime.speak("请明确说“确认”或“取消”。");
      return;
    }

    const actions = [...this.pendingActions];
    this.pendingActions = [];
    this.awaitingConfirmation = false;
    await this.deps.executeActions(actions);
    await this.deps.realtime.speak("已确认，正在执行。");
  }
}

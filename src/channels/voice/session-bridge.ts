import type { SummaryBuilder } from "../../bridge/summarizer.js";
import type { MemoryStore } from "../../memory-store/store.js";
import type { VoiceSessionSummary } from "./types.js";

export class SessionBridge {
  constructor(
    private readonly store: MemoryStore,
    private readonly summarizer: SummaryBuilder,
  ) {}

  async bootstrapContext(lookbackMinutes: number): Promise<string[]> {
    const since = new Date(Date.now() - lookbackMinutes * 60_000).toISOString();
    const summaries = await this.store.listRecentSummaries({ sinceIso: since, limit: 5 });
    return summaries.map((entry) => `${entry.channel}: ${entry.summary}`);
  }

  async persistVoiceSummary(params: {
    sessionId: string;
    decisions: string[];
    channel?: string;
  }): Promise<VoiceSessionSummary> {
    const summary = await this.summarizer.summarize(params.decisions);
    const entry: VoiceSessionSummary = {
      sessionId: params.sessionId,
      channel: params.channel ?? "voice",
      summary,
      createdAt: new Date().toISOString(),
    };
    await this.store.persistSummary(entry);
    return entry;
  }
}

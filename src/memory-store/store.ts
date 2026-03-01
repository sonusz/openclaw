import type { VoiceSessionSummary } from "../channels/voice/types.js";

export interface MemoryStore {
  listRecentSummaries(params: { sinceIso: string; limit: number }): Promise<VoiceSessionSummary[]>;
  persistSummary(entry: VoiceSessionSummary): Promise<void>;
}

export class InMemoryVoiceSummaryStore implements MemoryStore {
  private readonly summaries: VoiceSessionSummary[] = [];

  async listRecentSummaries(params: {
    sinceIso: string;
    limit: number;
  }): Promise<VoiceSessionSummary[]> {
    const sinceTs = Date.parse(params.sinceIso);
    return this.summaries
      .filter((entry) => Date.parse(entry.createdAt) >= sinceTs)
      .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, params.limit);
  }

  async persistSummary(entry: VoiceSessionSummary): Promise<void> {
    this.summaries.push(entry);
  }
}

import { describe, expect, it, vi } from "vitest";
import { ConfirmationHandler } from "./confirmation.js";
import { VoiceTurnManager } from "./turn-manager.js";
import { VoiceAdapter } from "./voice-adapter.js";

describe("VoiceTurnManager", () => {
  it("cancels playback and realtime response on speech_started", async () => {
    const stopPlayback = vi.fn(async () => {});
    const cancelResponse = vi.fn(async () => {});

    const manager = new VoiceTurnManager({
      realtime: {
        stopPlayback,
        cancelResponse,
        speak: vi.fn(async () => {}),
      } as never,
      adapter: new VoiceAdapter(async () => ({ sayText: "ok", actions: [] })),
      confirmation: new ConfirmationHandler(["confirm"], ["cancel"]),
      bootstrapContext: [],
      voiceSessionId: "voice-1",
      executeActions: async () => {},
    });

    await manager.onSpeechStarted();

    expect(stopPlayback).toHaveBeenCalledOnce();
    expect(cancelResponse).toHaveBeenCalledOnce();
  });

  it("gates side effects behind explicit confirmation", async () => {
    const speak = vi.fn(async () => {});
    const executeActions = vi.fn(async () => {});

    const manager = new VoiceTurnManager({
      realtime: {
        stopPlayback: vi.fn(async () => {}),
        cancelResponse: vi.fn(async () => {}),
        speak,
      } as never,
      adapter: new VoiceAdapter(async () => ({
        sayText: "要执行删除操作，请确认",
        actions: [{ toolName: "danger", sideEffectLevel: "SIDE_EFFECT" }],
      })),
      confirmation: new ConfirmationHandler(["确认"], ["取消"]),
      bootstrapContext: [],
      voiceSessionId: "voice-2",
      executeActions,
    });

    await manager.onFinalTranscript("删除它");
    expect(executeActions).not.toHaveBeenCalled();

    await manager.onFinalTranscript("确认");
    expect(executeActions).toHaveBeenCalledOnce();
  });
});

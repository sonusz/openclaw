import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";
import { SimpleSummaryBuilder } from "../../bridge/summarizer.js";
import { InMemoryVoiceSummaryStore } from "../../memory-store/store.js";
import { ConfirmationHandler } from "./confirmation.js";
import { RealtimeIo } from "./realtime-io.js";
import { SessionBridge } from "./session-bridge.js";
import { VoiceTurnManager } from "./turn-manager.js";
import type { VoiceConfig } from "./types.js";
import { VoiceAdapter, type VoiceAgentRunner } from "./voice-adapter.js";

const defaultConfigPath = path.resolve(process.cwd(), "config/voice.yaml");

export async function loadVoiceConfig(configPath = defaultConfigPath): Promise<VoiceConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = YAML.parse(raw) as Record<string, unknown>;

  return {
    openai: {
      apiKey: String(process.env.OPENAI_API_KEY ?? ""),
      model: String((parsed.openai as Record<string, unknown>).model),
      voice: String((parsed.openai as Record<string, unknown>).voice),
      temperature: Number((parsed.openai as Record<string, unknown>).temperature),
    },
    audio: {
      inputFormat: "pcm16",
      outputFormat: "pcm16",
      sampleRate: Number((parsed.audio as Record<string, unknown>).sample_rate),
    },
    vad: {
      type: "server_vad",
      threshold: Number((parsed.vad as Record<string, unknown>).threshold),
      prefixPaddingMs: Number((parsed.vad as Record<string, unknown>).prefix_padding_ms),
      silenceDurationMs: Number((parsed.vad as Record<string, unknown>).silence_duration_ms),
    },
    session: {
      idleTimeoutSeconds: Number((parsed.session as Record<string, unknown>).idle_timeout_seconds),
      bootstrapSummaryLookbackMinutes: Number(
        (parsed.session as Record<string, unknown>).bootstrap_summary_lookback_minutes,
      ),
      maxSayDurationSeconds: Number(
        (parsed.session as Record<string, unknown>).max_say_duration_seconds,
      ),
    },
    safety: {
      requireConfirmationForSideEffect: Boolean(
        (parsed.safety as Record<string, unknown>).require_confirmation_for_side_effect,
      ),
      confirmationKeywords:
        ((parsed.safety as Record<string, unknown>).confirmation_keywords as string[]) ?? [],
      cancelKeywords:
        ((parsed.safety as Record<string, unknown>).cancel_keywords as string[]) ?? [],
    },
  };
}

const demoAgentRunner: VoiceAgentRunner = async ({ userText }) => ({
  sayText: `收到：${userText}`,
  actions: [],
});

export async function runVoiceChannel(): Promise<void> {
  const cfg = await loadVoiceConfig();
  const realtime = new RealtimeIo();
  const memoryStore = new InMemoryVoiceSummaryStore();
  const bridge = new SessionBridge(memoryStore, new SimpleSummaryBuilder());
  const bootstrapContext = await bridge.bootstrapContext(
    cfg.session.bootstrapSummaryLookbackMinutes,
  );
  const adapter = new VoiceAdapter(demoAgentRunner);
  const confirmation = new ConfirmationHandler(
    cfg.safety.confirmationKeywords,
    cfg.safety.cancelKeywords,
  );

  const manager = new VoiceTurnManager({
    realtime,
    adapter,
    confirmation,
    bootstrapContext,
    voiceSessionId: `voice-${Date.now()}`,
    executeActions: async () => {},
  });

  await realtime.connect();
  await realtime.sessionUpdate({
    instructions: "Transcribe and synthesize only. Never use tools.",
    voice: cfg.openai.voice,
    inputAudioFormat: cfg.audio.inputFormat,
    outputAudioFormat: cfg.audio.outputFormat,
    turnDetection: {
      type: cfg.vad.type,
      threshold: cfg.vad.threshold,
      prefixPaddingMs: cfg.vad.prefixPaddingMs,
      silenceDurationMs: cfg.vad.silenceDurationMs,
    },
  });

  realtime.onEvent(async (event) => {
    if (event.type === "speech_started") {
      await manager.onSpeechStarted();
      return;
    }
    await manager.onFinalTranscript(event.text);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runVoiceChannel();
}

import { EventEmitter } from "node:events";

export type RealtimeSpeechStartedEvent = { type: "speech_started" };
export type RealtimeTranscriptFinalEvent = { type: "final_transcript"; text: string };
export type RealtimeEvent = RealtimeSpeechStartedEvent | RealtimeTranscriptFinalEvent;

export type RealtimeSessionUpdatePayload = {
  instructions: string;
  voice: string;
  inputAudioFormat: string;
  outputAudioFormat: string;
  turnDetection: {
    type: "server_vad";
    threshold: number;
    prefixPaddingMs: number;
    silenceDurationMs: number;
  };
};

export class RealtimeIo {
  private readonly emitter = new EventEmitter();

  async connect(): Promise<void> {
    // Wire up OpenAI Realtime websocket in production implementation.
  }

  async sessionUpdate(_payload: RealtimeSessionUpdatePayload): Promise<void> {
    // Send session.update to keep realtime as IO-only layer.
  }

  async appendInputAudio(_pcm16Chunk: Buffer): Promise<void> {
    // Stream microphone input frames.
  }

  async speak(_text: string): Promise<void> {
    // Convert text into assistant response stream from Realtime API.
  }

  async cancelResponse(): Promise<void> {
    // Send response.cancel for barge-in.
  }

  async stopPlayback(): Promise<void> {
    // Interrupt local audio playback immediately.
  }

  onEvent(handler: (event: RealtimeEvent) => Promise<void> | void): () => void {
    this.emitter.on("event", handler);
    return () => this.emitter.off("event", handler);
  }

  emitTestEvent(event: RealtimeEvent): void {
    this.emitter.emit("event", event);
  }
}
